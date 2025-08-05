// background.js
// 监听命令事件
browser.commands.onCommand.addListener((command) => {
  if (command == "save-canvas-shortcut") {
    // 获取当前活动的标签页
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) {
        if (!tabs[0] || typeof tabs[0].id == 'undefined') { return; }
        // 向 content.js 发送消息，告诉它执行保存操作
        browser.tabs.sendMessage(tabs[0].id, {
          action: BACKGROUND_COMMAND.GET_CANVAS,
          type: CANVAS_GETTING_TYPE.CURSOR
        });
      }
    });
  }
});

// 监听扩展图标点击事件
browser.browserAction.onClicked.addListener(() => {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (!tabs[0] || typeof tabs[0].id == 'undefined') { return; }
    // 向 content.js 发送请求，要求模糊选取
    browser.tabs.sendMessage(tabs[0].id, {
      action: BACKGROUND_COMMAND.GET_CANVAS,
      type: CANVAS_GETTING_TYPE.AUTO
    });
  });
});



// 下载完成后回收临时的 URL
const downloadUrls = new Map();
browser.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    const url = downloadUrls.get(delta.id);
    if (url) {
      URL.revokeObjectURL(url);
      downloadUrls.delete(delta.id);
    }
  }
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === CONTENT_COMMAND.SAVE_CANVAS) {
    if (!request.canvasRect) { return; }
    const { x, y, width, height } = request.canvasRect;

    if (!sender.tab || typeof sender.tab.windowId == 'undefined') { return; }

    // 1. 调用 captureVisibleTab() 截取整个可见区域
    browser.tabs.captureVisibleTab(sender.tab.windowId, { format: CONFIG.image_ext }).then(dataUrl => {
      // 2. 将 Data URL 转换为 Image 对象
      const image = new Image();
      image.onload = () => {
        // 3. 创建一个离屏 Canvas
        const croppedCanvas = new OffscreenCanvas(width, height);
        const ctx = croppedCanvas.getContext('2d');

        if (!ctx) { return; }

        // 4. 在离屏 Canvas 上绘制裁剪后的图像
        ctx.drawImage(image, x, y, width, height, 0, 0, width, height);

        // 5. 从离屏 Canvas 获取 Blob
        croppedCanvas.convertToBlob({ type: `image/${CONFIG.image_ext}` }).then(blob => {
          // 6. 将 Blob 发送给 downloads API
          const filename = CONFIG.image_name + '.' + CONFIG.image_ext;
          const url = URL.createObjectURL(blob);
          browser.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
          }).then(downloadId => {
            // download() 方法成功后会返回一个下载 ID
            // 将 ID 和 URL 存储起来
            downloadUrls.set(downloadId, url);
          });
        });
      };
      image.src = dataUrl;
    });
  }
});