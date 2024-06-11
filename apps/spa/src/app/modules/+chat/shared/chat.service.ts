import { Injectable, Injector } from '@angular/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  Subscription,
  take,
  tap,
} from 'rxjs';
import {
  ImageFileContentBlock,
  Message,
  MessageContent,
  Text,
} from 'openai/resources/beta/threads/messages';
import { OpenAiFile, GetThreadResponseDto } from '@boldare/openai-assistant';
import { ChatRole, ChatMessage, ChatMessageStatus } from './chat.model';
import { ChatGatewayService } from './chat-gateway.service';
import { ChatClientService } from './chat-client.service';
import { ThreadService } from './thread.service';
import { ChatFilesService } from './chat-files.service';
import { MessageContentService } from '../../../components/controls/message-content/message-content.service';
import { environment } from '../../../../environments/environment';
import { AnnotationPipe } from '../../../pipes/annotation.pipe';

@Injectable({ providedIn: 'root' })
export class ChatService {
  isLoading$ = new BehaviorSubject<boolean>(false);
  isVisible$ = new BehaviorSubject<boolean>(environment.isAutoOpen);
  isTyping$ = new BehaviorSubject<boolean>(false);
  isResponding$ = new BehaviorSubject<boolean>(false);
  messages$ = new BehaviorSubject<ChatMessage[]>([]);

  constructor(
    private readonly chatGatewayService: ChatGatewayService,
    private readonly chatClientService: ChatClientService,
    private readonly threadService: ThreadService,
    private readonly chatFilesService: ChatFilesService,
    private readonly messageContentService: MessageContentService,
    private readonly annotationPipe: AnnotationPipe,
  ) {
    document.body.classList.add('ai-chat');

    this.subscribeMessages();
    this.setInitialValues();
    this.watchVisibility();
  }

  subscribeMessages(): void {
    if (!environment.isStreamingEnabled) {
      this.watchMessages();
    } else {
      this.watchTextCreated();
      this.watchTextDelta();
      this.watchTextDone();
    }
  }

  isMessageInvisible(message: Message): boolean {
    const metadata = message.metadata as Record<string, unknown>;
    return metadata?.['status'] === ChatMessageStatus.Invisible;
  }

  isTextMessage(message: Message): boolean {
    return message.content?.[0]?.type === 'text';
  }

  parseMessages(thread: GetThreadResponseDto): Message[] {
    if (!thread.messages) {
      return [];
    }

    return thread.messages
      .reverse()
      .filter(
        message =>
          this.isTextMessage(message) && !this.isMessageInvisible(message),
      );
  }

  setInitialValues(): void {
    this.threadService.threadId$
      .pipe(
        distinctUntilChanged(),
        filter(threadId => !!threadId),
        tap(() => this.isLoading$.next(true)),
        mergeMap(threadId => this.threadService.getThread(threadId)),
        map(
          (response: GetThreadResponseDto) =>
            this.parseMessages(response) as ChatMessage[],
        ),
      )
      .subscribe(data => {
        this.messages$.next(data);
        this.isLoading$.next(false);
      });
  }

  toggle(): void {
    this.isVisible$.next(!this.isVisible$.value);
  }

  refresh(): void {
    this.isLoading$.next(true);
    this.isTyping$.next(false);
    this.isResponding$.next(false);
    this.messages$.next([]);
    this.threadService.start().subscribe();
  }

  clear(): void {
    this.isTyping$.next(false);
    this.isResponding$.next(false);
    this.threadService.clear();
    this.messages$.next([]);
  }

  changeView(): void {
    window?.top?.postMessage('changeView', '*');
  }

  addMessage(message: ChatMessage): void {
    this.messages$.next([...this.messages$.value, message]);
  }

  addFileMessage(files: OpenAiFile[]): void {
    if (!files?.length) {
      return;
    }

    this.addMessage({
      content: `The user has attached files to the message: ${files
        .map(file => file.filename)
        .join(', ')}`,
      role: ChatRole.System,
    });
  }

  async sendMessage(content: string, role = ChatRole.User): Promise<void> {
    this.isTyping$.next(true);
    this.isResponding$.next(true);
    this.addMessage({ content, role });

    const files = await this.chatFilesService.sendFiles();
    this.addFileMessage(files);

    this.chatGatewayService.callStart({
      content: await this.getMessageContent(content),
      threadId: this.threadService.threadId$.value,
      attachments: files.map(
        file =>
          ({
            file_id: file.id,
            tools: [{ type: 'code_interpreter' }],
          }) || [],
      ),
    });
  }

  async getMessageContent(content: string): Promise<MessageContent[]> {
    const images = (await this.messageContentService.sendFiles()) || [];
    const imageFileContentList =
      images?.map(
        file =>
          ({
            type: 'image_file',
            image_file: {
              file_id: file.id,
            },
          }) as ImageFileContentBlock,
      ) || [];

    this.messages$.next([
      ...this.messages$.value.slice(0, -1),
      {
        content: [
          {
            type: 'text',
            text: {
              value: content,
              annotations: [],
            },
          },
          ...imageFileContentList,
        ],
        role: ChatRole.User,
      },
    ]);

    return [
      {
        type: 'text',
        text: content as unknown as Text,
      },
      ...imageFileContentList,
    ];
  }

  watchTextCreated(): Subscription {
    return this.chatGatewayService.textCreated().subscribe(data => {
      this.isTyping$.next(false);
      this.isResponding$.next(true);
      this.addMessage({ content: data.text.value, role: ChatRole.Assistant });
    });
  }

  watchTextDelta(): Subscription {
    return this.chatGatewayService.textDelta().subscribe(data => {
      const length = this.messages$.value.length;
      this.isResponding$.next(true);
      this.messages$.value[length - 1].content = data.text.value;
    });
  }

  watchTextDone(): Subscription {
    return this.chatGatewayService.textDone().subscribe(event => {
      this.isTyping$.next(false);
      this.isResponding$.next(false);
      this.messages$.next([
        ...this.messages$.value.slice(0, -1),
        {
          content: this.annotationPipe.transform(event),
          role: ChatRole.Assistant,
        },
      ]);
    });
  }

  watchMessages(): Subscription {
    return this.chatGatewayService.callDone().subscribe(data => {
      this.addMessage({
        content: data.content,
        role: ChatRole.Assistant,
      });
      this.isTyping$.next(false);
      this.isResponding$.next(false);
    });
  }

  sendAudio(file: Blob): void {
    this.isTyping$.next(true);
    this.isResponding$.next(true);

    this.chatClientService
      .transcription({ file: file as File })
      .pipe(take(1))
      .subscribe(response => this.sendMessage(response.content));
  }

  watchVisibility(): Subscription {
    return this.isVisible$.subscribe(isVisible => {
      if (isVisible) {
        document.body.classList.add('ai-assistant-open');
      } else {
        document.body.classList.remove('ai-assistant-open');
      }
    });
  }

  loadScript(): void {
    const body: HTMLDivElement = document.body as HTMLDivElement;
    const script = document.createElement('script') as HTMLScriptElement;

    script.innerHTML = '';
    script.src = '/assets/js/ai-embedded.js';
    script.async = true;
    script.defer = true;
    script.dataset['chatInitial'] = 'true';
    body.appendChild(script);
  }
}
