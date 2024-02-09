export const addIframeClass = (className: string) => `.${className} {
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  max-width: 440px;
  height: 85vh;
  min-height: 300px;
  max-height: 600px;
  width: 100%;
  margin: auto;
  box-sizing: border-box;
  border-radius: 16px;
  border: 0;
  box-shadow: rgba(17, 17, 26, 0.1) 0 4px 16px, rgba(17, 17, 26, 0.1) 0 8px 32px;
  z-index: 150;
  animation: iframeAnimation 0.2s;
}

@keyframes iframeAnimation {
  0% {
    transform: translateY(20px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 460px) {
  .${className} {
    width: calc(100% - 20px);
    left: 10px;
    right: 10px;
    bottom: 10px;
    height: calc(100% - 20px);
  }
}
`;

export const addTriggerClass = (className: string) => `
@keyframes trigger {
  0% {
    transform: scale(1);
  }
  20% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes triggerFadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.${className} {
  display: block;
  position: fixed;
  bottom: 0;
  right: 0;
  margin: 24px;
  width: 60px;
  height: 60px;
  border: 6px solid #ffffff;
  border-radius: 50%;
  box-shadow: rgba(17, 17, 26, 0.1) 0 4px 16px, rgba(17, 17, 26, 0.1) 0 8px 32px;
  background-color: #2a2a2a;
  background-image: url('data:image/jpeg;base64,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');
  background-size: cover;
  background-position: center;
  transition: 0.2s all ease-in-out;
  cursor: pointer;
  z-index: 100;
  opacity: 0;
  animation: triggerFadeIn 0.2s ease-in;
  animation-delay: 2s;

  @media (max-width: 460px) {
    width: 40px;
    height: 40px;
    margin: 10px;
  }
}

.${className}:hover {
  box-shadow: rgb(17, 17, 26, .3) 0 4px 26px, rgb(17, 17, 26, 0.1) 0 8px 32px;
  transform: scale(1.05);
}

.${className}.is-animated {
  animation: trigger 1.5s infinite, triggerFadeIn 1s;
  animation-delay: 2s;
  animation-fill-mode: both;
}`;
