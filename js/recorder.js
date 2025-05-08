let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let stream;
let mimeType = '';

const videoElement = document.getElementById("video");
const recordPreview = document.getElementById("record-preview");
const recordBtn = document.getElementById("record-btn");
const recIndicator = document.getElementById("rec-indicator");

//detectar o melhor formato suportado
function getSupportedMimeType() {
  const types = [
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

let currentFormat = '';

async function setupStream() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: true
    });
    
    videoElement.srcObject = stream;
    currentFormat = getSupportedMimeType();
    
    // Priorizar MP4 no iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      console.log("Dispositivo iOS detectado. Usando MP4.");
      currentFormat = 'video/mp4;codecs=avc1';
    }
    console.log("Formato atual:", currentFormat);
    
    return true;
  } catch (err) {
    console.error("Erro ao acessar a câmera:", err);
    return false;
  }
}

function createActionButtons(blob, fileExt) {
  const containerButtons = document.querySelector(".camera-info.top-right.close");
  const closeButton = document.querySelector("#close-btn");
  const downloadButton = document.querySelector("#download-btn");

  closeButton.replaceWith(closeButton.cloneNode(true));
  downloadButton.replaceWith(downloadButton.cloneNode(true));
  
  const newCloseButton = document.querySelector("#close-btn");
  const newDownloadButton = document.querySelector("#download-btn");

  newCloseButton.addEventListener('click', async () => {
    // esconder o preview
    recordPreview.style.display = 'none';
    recordPreview.src = '';
    
    // mostrar o elemento de vídeo da câmera
    videoElement.style.display = 'block';
    containerButtons.style.display = 'none';
    
    recordPreview.pause();
    
    // liberar memória
    if (recordPreview.src) {
      URL.revokeObjectURL(recordPreview.src);
    }
    
    // reiniciar a câmera
    try {
      await setupStream();
    } catch (err) {
      console.error("Erro ao reiniciar a câmera:", err);
      alert("Não foi possível reiniciar a câmera. Por favor, recarregue a página.");
    }
  });

  newDownloadButton.addEventListener('click', () => {
    const videoURL = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = videoURL;
    a.download = `gravacao.${fileExt}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(videoURL);
    }, 100);
  });

  if (containerButtons) {
    containerButtons.style.display = "flex";
  }
}

recordBtn.addEventListener("click", async () => {
  if (!isRecording) {
    recordPreview.style.display = 'none';
    videoElement.style.display = 'block';

    if (!stream) {
      const success = await setupStream();
      if (!success) return;
    }

    recordedChunks = [];
    
    try {
      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (e) {
      console.warn("Erro ao criar MediaRecorder com o tipo preferido, usando padrão:", e);
      mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { 
        type: currentFormat || 'video/mp4' 
      });

      const ext = currentFormat.includes('mp4') ? 'mp4' : 'webm';
      const videoURL = URL.createObjectURL(blob);

      recordPreview.src = videoURL;
      recordPreview.style.display = "block";
      videoElement.style.display = "none";

      // Forçar tipo de vídeo para iOS
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        recordPreview.setAttribute('type', 'video/mp4');
      }

      // recordPreview.play();

      createActionButtons(blob, ext);
    };

    mediaRecorder.start(1000); // coletar dados a cada 1s para maior confiabilidade
    isRecording = true;
    recIndicator.style.display = "flex";
    recordBtn.classList.add("recording");
    recordBtn.innerHTML = '<i class="fas fa-stop" style="font-size: 20px;"></i>';

  } else {
    mediaRecorder.stop();
    isRecording = false;
    recIndicator.style.display = "none";
    recordBtn.classList.remove("recording");
    recordBtn.innerHTML = '<i class="fas fa-video" style="font-size: 20px;"></i>';
    
    // parar todas as tracks para liberar a câmera
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
});
