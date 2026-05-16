import { encodingForModel } from "js-tiktoken";

const enc = encodingForModel("gpt-4");

export function countTokens(text: string) {
  return enc.encode(text).length;
}
export function countMessageTokens(messages: any[]) {
  return messages.reduce((total, msg) => {
    return total + enc.encode(msg.content).length;
  }, 0);
}