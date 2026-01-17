#!/usr/bin/env python3
import sys
from PIL import Image, ImageDraw, ImageFont

# 创建512x512的图像
size = 512
img = Image.new('RGB', (size, size), color='#1890ff')
draw = ImageDraw.Draw(img)

# 尝试加载字体
try:
    # 尝试使用系统字体
    font_size = 200
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
except:
    # 如果找不到字体，使用默认字体
    font = ImageFont.load_default()

# 绘制文字
text = "AI"
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
position = ((size - text_width) // 2, (size - text_height) // 2)
draw.text(position, text, fill='white', font=font)

# 保存为PNG
output_path = sys.argv[1] if len(sys.argv) > 1 else 'icon.png'
img.save(output_path, 'PNG', optimize=True)
print(f"✓ Created icon: {output_path}")
