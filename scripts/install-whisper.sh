#!/bin/bash

# Whisper本地模型安装脚本
# 支持 whisper.cpp 和 Python whisper 两种安装方式

set -e

echo "🎙️  开始安装本地Whisper模型..."

# 检查系统类型
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo "❌ 不支持的操作系统: $OSTYPE"
    exit 1
fi

# 创建模型目录
MODEL_DIR="./models"
mkdir -p $MODEL_DIR
TEMP_DIR="./temp"
mkdir -p $TEMP_DIR

echo "📁 创建模型目录: $MODEL_DIR"

# 选项1: 安装 whisper.cpp (推荐)
install_whisper_cpp() {
    echo "🔧 安装 whisper.cpp..."
    
    if [ ! -d "whisper.cpp" ]; then
        git clone https://github.com/ggerganov/whisper.cpp.git
    fi
    
    cd whisper.cpp
    
    # 编译
    make clean
    make
    
    # 下载base模型
    if [ ! -f "models/ggml-base.bin" ]; then
        echo "📥 下载Whisper base模型..."
        ./models/download-ggml-model.sh base
    fi
    
    # 复制模型到项目目录
    cp models/ggml-base.bin ../$MODEL_DIR/
    
    cd ..
    
    echo "✅ whisper.cpp 安装完成"
    echo "   可执行文件: ./whisper.cpp/main"
    echo "   模型文件: ./$MODEL_DIR/ggml-base.bin"
}

# 选项2: 安装 Python whisper
install_python_whisper() {
    echo "🐍 安装 Python whisper..."
    
    # 检查Python环境
    if ! command -v python3 &> /dev/null; then
        echo "❌ 未找到Python3，请先安装Python"
        exit 1
    fi
    
    # 安装依赖
    pip3 install -U openai-whisper
    
    # 安装ffmpeg (必需)
    if [ "$OS" = "linux" ]; then
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    elif [ "$OS" = "macos" ]; then
        if command -v brew &> /dev/null; then
            brew install ffmpeg
        else
            echo "❌ 请先安装Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    fi
    
    echo "✅ Python whisper 安装完成"
    echo "   使用命令: python3 -m whisper audio.wav --model base"
}

# 交互式选择安装方式
echo "请选择安装方式:"
echo "1) whisper.cpp (推荐，更快，C++实现)"
echo "2) Python whisper (易于安装，功能丰富)"
echo "3) 两者都安装"
echo "4) 仅创建配置"

read -p "请输入选择 [1-4]: " choice

case $choice in
    1)
        install_whisper_cpp
        ;;
    2)
        install_python_whisper
        ;;
    3)
        install_whisper_cpp
        install_python_whisper
        ;;
    4)
        echo "⏭️  跳过安装，仅创建配置"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

# 创建环境配置文件
echo "📝 创建环境配置..."

cat >> .env.local << EOF
# Whisper本地模型配置
WHISPER_PATH=$(pwd)/whisper.cpp/main
WHISPER_MODEL_PATH=$(pwd)/models/ggml-base.bin
WHISPER_LANGUAGE=auto
WHISPER_THREADS=4
EOF

echo "✅ 环境配置已保存到 .env.local"

# 测试安装
echo "🧪 测试Whisper安装..."

if [ -f "./whisper.cpp/main" ]; then
    echo "✅ whisper.cpp 可用"
    WHISPER_CMD="./whisper.cpp/main"
elif command -v python3 &> /dev/null && python3 -c "import whisper" &> /dev/null; then
    echo "✅ Python whisper 可用"
    WHISPER_CMD="python3 -m whisper"
else
    echo "⚠️  未找到可用的Whisper安装"
    echo "   请手动安装或检查安装过程"
fi

echo ""
echo "🎉 Whisper本地模型安装完成！"
echo ""
echo "📋 使用说明:"
echo "1. 确保环境变量已设置: source .env.local"
echo "2. 在语音识别服务中设置 model='whisper-local'"
echo "3. 支持的音频格式: wav, mp3, flac, m4a, ogg"
echo ""
echo "💡 提示:"
echo "- 首次识别会稍慢，需要加载模型"
echo "- base模型大小约140MB"
echo "- 支持多语言识别，自动检测语言"