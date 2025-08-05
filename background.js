// 当工具栏按钮被点击时
browser.browserAction.onClicked.addListener(() => {
  // 在当前活动的标签页中执行一个脚本
  browser.tabs.executeScript({
    file: './content.js'
  });
});

// 创建一个 Map 来存储下载 ID 和其对应的 URL
const downloadUrls = new Map();


// 监听下载状态的变化
browser.downloads.onChanged.addListener((delta) => {
  // 检查下载是否已完成
  if (delta.state && delta.state.current === 'complete') {
    // 查找该下载 ID 对应的 URL
    const url = downloadUrls.get(delta.id);
    if (url) {
      // 下载完成后，安全地释放 URL
      URL.revokeObjectURL(url);
      // 从 Map 中移除记录
      downloadUrls.delete(delta.id);
    }
  }
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadBlob" && request.blob && request.filename) {
    const url = URL.createObjectURL(request.blob);

    // 启动下载，这是一个异步操作
    browser.downloads.download({
      url: url,
      filename: request.filename,
      saveAs: true
    }).then(downloadId => {
      // download() 方法成功后会返回一个下载 ID
      // 我们将 ID 和 URL 存储起来
      downloadUrls.set(downloadId, url);
      // 这里不能立即调用 URL.revokeObjectURL(), 需要等下载完全完成再执行
    });
  }
});