// utils/imageResizer.ts
export const resizeImage = (file: File, maxWidth = 1000): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        const scaleFactor = maxWidth / img.width;
        
        // ถ้ารูปเล็กอยู่แล้ว ไม่ต้องย่อ
        if (img.width <= maxWidth) {
          resolve(file);
          return;
        }

        elem.width = maxWidth;
        elem.height = img.height * scaleFactor;
        
        const ctx = elem.getContext('2d');
        ctx?.drawImage(img, 0, 0, elem.width, elem.height);
        
        ctx?.canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Resize failed'));
          }
        }, 'image/jpeg', 0.8); // 0.8 คือคุณภาพ (80%)
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};