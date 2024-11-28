export class ImageProcessor {
  static async blurImage(imageUrl) {
    try {
      // Create a new canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Load image
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';  // Enable CORS
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Set canvas size to match image
      canvas.width = image.width;
      canvas.height = image.height;

      // Draw original image
      ctx.drawImage(image, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply Gaussian blur
      const blurredData = ImageProcessor.gaussianBlur(data, canvas.width, canvas.height, 100);

      // Put blurred image data back to canvas
      ctx.putImageData(new ImageData(blurredData, canvas.width, canvas.height), 0, 0);

      // Convert to base64
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error blurring image:', error);
      return imageUrl; // Return original image if blurring fails
    }
  }

  static gaussianBlur(data, width, height, radius) {
    const blurredData = new Uint8ClampedArray(data.length);
    const weight = new Float32Array(radius * 2 + 1);
    const totalWeight = ImageProcessor.calculateGaussianWeights(weight, radius);

    // Apply horizontal blur
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let i = -radius; i <= radius; i++) {
          const xi = Math.min(width - 1, Math.max(0, x + i));
          const idx = (y * width + xi) * 4;
          r += data[idx] * weight[i + radius];
          g += data[idx + 1] * weight[i + radius];
          b += data[idx + 2] * weight[i + radius];
          a += data[idx + 3] * weight[i + radius];
        }
        const idx = (y * width + x) * 4;
        blurredData[idx] = r / totalWeight;
        blurredData[idx + 1] = g / totalWeight;
        blurredData[idx + 2] = b / totalWeight;
        blurredData[idx + 3] = a / totalWeight;
      }
    }

    // Apply vertical blur
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let i = -radius; i <= radius; i++) {
          const yi = Math.min(height - 1, Math.max(0, y + i));
          const idx = (yi * width + x) * 4;
          r += blurredData[idx] * weight[i + radius];
          g += blurredData[idx + 1] * weight[i + radius];
          b += blurredData[idx + 2] * weight[i + radius];
          a += blurredData[idx + 3] * weight[i + radius];
        }
        const idx = (y * width + x) * 4;
        data[idx] = r / totalWeight;
        data[idx + 1] = g / totalWeight;
        data[idx + 2] = b / totalWeight;
        data[idx + 3] = a / totalWeight;
      }
    }

    return data;
  }

  static calculateGaussianWeights(weight, radius) {
    const sigma = radius / 3;
    let totalWeight = 0;
    for (let i = -radius; i <= radius; i++) {
      weight[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma));
      totalWeight += weight[i + radius];
    }
    return totalWeight;
  }
}