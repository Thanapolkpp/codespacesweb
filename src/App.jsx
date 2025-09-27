// เลือกองค์ประกอบ HTML
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const videoElement = document.getElementById('webcam');
const statusElement = document.getElementById('status');

// ตัวแปรสำหรับเก็บสตรีมของกล้อง
let currentStream = null;

// ฟังก์ชันสำหรับเปิดกล้อง
const startCamera = async () => {
    try {
        // ถ้ามีสตรีมเก่าอยู่ ให้ปิดก่อน
        if (currentStream) {
            stopCamera();
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
        });
        
        currentStream = stream;
        videoElement.srcObject = stream;
        
        // อัปเดต UI
        statusElement.classList.add('hidden'); // ซ่อนข้อความสถานะ
        startButton.classList.add('hidden');   // ซ่อนปุ่มเปิด
        stopButton.classList.remove('hidden'); // แสดงปุ่มหยุด

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการเข้าถึงกล้อง:", error);
        alert("ไม่สามารถเข้าถึงกล้องได้ โปรดตรวจสอบว่าคุณได้อนุญาตให้ใช้งานกล้องในเบราว์เซอร์แล้ว");
    }
};

// ฟังก์ชันสำหรับหยุดกล้อง
const stopCamera = () => {
    if (currentStream) {
        // วนลูปเพื่อหยุดทุก track ในสตรีม (วิธีที่ถูกต้องในการปิดกล้อง)
        currentStream.getTracks().forEach(track => {
            track.stop();
        });
    }
    
    videoElement.srcObject = null;
    currentStream = null;

    // อัปเดต UI
    statusElement.classList.remove('hidden'); // แสดงข้อความสถานะ
    startButton.classList.remove('hidden');   // แสดงปุ่มเปิด
    stopButton.classList.add('hidden');     // ซ่อนปุ่มหยุด
};

// กำหนด Event Listeners ให้กับปุ่ม
startButton.addEventListener('click', startCamera);
stopButton.addEventListener('click', stopCamera);