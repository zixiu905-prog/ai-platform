#!/usr/bin/env python3
"""
AI智能体平台 - 简单图标生成脚本
生成应用图标（PNG格式）
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_app_icon(size=512):
    """创建应用图标"""
    # 创建图像
    img = Image.new('RGBA', (size, size), (24, 144, 255, 255))  # #1890ff
    draw = ImageDraw.Draw(img)
    
    # 绘制圆角矩形边框
    margin = size // 10
    corner_radius = size // 5
    draw.rounded_rectangle(
        [(margin, margin), (size - margin, size - margin)],
        radius=corner_radius,
        outline=(255, 255, 255, 255),
        width=size // 40
    )
    
    # 绘制文字 "AI"
    try:
        # 尝试使用不同的字体
        fonts_to_try = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/System/Library/Fonts/Helvetica.ttc',
            'arial.ttf',
            'DejaVuSans-Bold.ttf'
        ]
        
        font = None
        for font_path in fonts_to_try:
            try:
                font = ImageFont.truetype(font_path, int(size * 0.35))
                break
            except:
                continue
        
        if font is None:
            font = ImageFont.load_default()
        
        # 获取文字边界框
        bbox = draw.textbbox((0, 0), "AI", font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # 计算文字位置（居中）
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - bbox[1]
        
        # 绘制文字
        draw.text((x, y), "AI", font=font, fill=(255, 255, 255, 255))
        
    except Exception as e:
        print(f"绘制文字失败: {e}，使用简单图形")
        # 绘制简单图形作为备选
        center = size // 2
        radius = size // 4
        draw.ellipse(
            [(center - radius, center - radius), (center + radius, center + radius)],
            fill=(255, 255, 255, 200),
            outline=(255, 255, 255, 255),
            width=size // 20
        )
    
    return img

def main():
    """主函数"""
    print("开始生成AI智能体平台图标...")
    
    # 输出目录
    output_dir = "/home/ai design/desk/build-resources"
    os.makedirs(output_dir, exist_ok=True)
    
    # 生成不同尺寸的PNG图标
    sizes = [16, 32, 64, 128, 256, 512]
    
    for size in sizes:
        try:
            print(f"生成 {size}x{size} 图标...")
            icon = create_app_icon(size)
            icon_path = os.path.join(output_dir, f"icon-{size}x{size}.png")
            icon.save(icon_path, 'PNG')
            print(f"  ✓ 已保存到 {icon_path}")
        except Exception as e:
            print(f"  ✗ 生成 {size}x{size} 图标失败: {e}")
    
    # 生成主图标（512x512）
    try:
        print("生成主图标 (512x512)...")
        icon = create_app_icon(512)
        icon_path = os.path.join(output_dir, "icon.png")
        icon.save(icon_path, 'PNG')
        print(f"  ✓ 已保存到 {icon_path}")
    except Exception as e:
        print(f"  ✗ 生成主图标失败: {e}")
    
    print("\n✅ 图标生成完成！")
    print(f"输出目录: {output_dir}")
    print("\n注意:")
    print("- PNG图标已生成，可以直接使用")
    print("- 如需ICO格式（Windows），需要使用ImageMagick或其他工具转换")
    print("- 如需ICNS格式（Mac），需要使用iconutil或其他工具转换")

if __name__ == "__main__":
    main()
