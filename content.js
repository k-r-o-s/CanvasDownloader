// content.js
(function () {
  const canvases = document.querySelectorAll('canvas');
  if (canvases.length > 0) {
    const baseName = 'canvas';
    canvases.forEach((canvas, index) => {
      canvas.toBlob((blob) => {
        if (blob) {
          // 使用 downloads API 保存 Blob
          const downloadFileName = canvases.length > 1 ? `${baseName}-${index + 1}.png` : baseName + '.png';
          // 获取 Blob 后，将其发送给 background.js
          browser.runtime.sendMessage({
            action: "downloadBlob",
            blob: blob,
            filename: downloadFileName,
          });
        } else {
          alert('无法生成 Blob 对象');
        }
      }, 'image/png');
    });
  } else {
    alert('未找到 Canvas 元素！');
  }
}())