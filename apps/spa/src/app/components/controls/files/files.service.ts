import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FilesService {
  files$ = new BehaviorSubject<File[]>([]);

  add(files: FileList) {
    const updatedFiles = [
      ...this.files$.value,
      ...Object.keys(files).map(key => files[key as unknown as number]),
    ];

    this.files$.next(updatedFiles);
  }

  delete(index: number): void {
    const updatedFiles = this.files$.value.splice(index, 1);
    this.files$.next(updatedFiles);
  }

  clear(): void {
    this.files$.next([]);
  }
}
