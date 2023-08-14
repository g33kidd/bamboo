// @ts-ignore
self.onmessage = (event: MessageEvent) => {
  console.log(event);
  postMessage("world");
};
