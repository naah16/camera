let currentStream = null;
let currentDeviceId = null;
let currentZoom = 1;
let torchEnabled = false;

const videoElement = document.getElementById('video');
const photoCanvas = document.getElementById('photo-canvas');
const startCameraBtn = document.getElementById('start-camera-btn');
const startCameraContainer = document.getElementById('start-camera-container');
const shutterBtn = document.getElementById('shutter-btn');
const flashEffect = document.getElementById('flash-effect');
const flashBtn = document.getElementById('flash-btn');
const zoomSlider = document.getElementById('zoom-slider');
const zoomLevel = document.getElementById('zoom-level');
const resolutionSize = document.getElementById('resolution-size');
const resolutionInfo = document.getElementById('resolution-info');
const switchCamBtn = document.getElementById('switch-cam-btn');
const cameraInfoTopRight = document.querySelector('.top-right');

const constraints = {
	video: {
		facingMode: 'environment',
		pan: true, zoom: true, tilt: true,
    width: { ideal: 1280 },
    height: { ideal: 720 }, 
	},
	audio: false
};

async function getCameraStream(deviceId = null, facingMode = null) {
  // liberar stream atual se existir
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }

  const newConstraints = {
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      ...(facingMode ? { facingMode: facingMode } : {}),
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(newConstraints);
    currentStream = stream;
    videoElement.srcObject = stream;

    const videoTrack = stream.getVideoTracks()[0];
    currentDeviceId = videoTrack.getSettings().deviceId || null;

    const settings = videoTrack.getSettings();
    
    if (settings.facingMode === 'user') {
      videoElement.style.transform = 'scaleX(-1)';
    } else {
      videoElement.style.transform = 'none';
    }

		
    handleCameraCapabilities(videoTrack);
    
    // atualizar resolução atual
    updateResolutionInfo(settings.width, settings.height);
    
    return true;
  } catch (err) {
    console.error('Erro ao acessar a câmera:', err);
    alert('Erro ao acessar a câmera: ' + err.message);
    return false;
  }
}

function updateResolutionInfo(width, height) {
  const resolutionText = `${width}x${height}`;
  resolutionInfo.textContent = resolutionText;
  
  // atualizar o select para refletir a resolução atual
  const option = Array.from(resolutionSize.options).find(
    opt => opt.value === resolutionText
  );
  if (option) option.selected = true;
}

function handleCameraCapabilities(track) {
	const capabilities = track.getCapabilities();
	console.log('Capacidades da câmera:', capabilities);

	if (capabilities.width && capabilities.height) {
		resolutionInfo.textContent = `Resolução: ${capabilities.width.max}x${capabilities.height.max}`;
	}

	if (capabilities.torch) {
		flashBtn.onclick = () => {
			torchEnabled = !torchEnabled;
			track.applyConstraints({ advanced: [{ torch: torchEnabled }] });
			flashEffect.style.display = torchEnabled ? 'block' : 'none';
			flashBtn.classList.toggle("active", torchEnabled);
		};
	}

	if (capabilities.zoom) {
		zoomSlider.min = capabilities.zoom.min;
		zoomSlider.max = capabilities.zoom.max;
		zoomSlider.step = capabilities.zoom.step || 0.1;
		zoomSlider.value = capabilities.zoom.min;
	
		zoomSlider.oninput = () => {
			currentZoom = parseFloat(zoomSlider.value);
			track.applyConstraints({ advanced: [{ zoom: currentZoom }] });
			const normalizedZoom = currentZoom / capabilities.zoom.min;
			zoomLevel.textContent = `${normalizedZoom.toFixed(1)}x zoom`;
		};
		
	}	
}

async function listCameras() {
	const devices = await navigator.mediaDevices.enumerateDevices();
	return devices.filter(device => device.kind === 'videoinput');
}

function updateZoom() {
	currentZoom = parseFloat(zoomSlider.value);
	zoomLevel.textContent = `${currentZoom.toFixed(1)}x zoom`;
}

function createActionButtons() {
  const containerButtons = document.querySelector(".camera-info.top-right.close");
  const closeButton = document.querySelector("#close-btn");
  const downloadButton = document.querySelector("#download-btn");

  // clonar botões para remover listeners antigos
  closeButton.replaceWith(closeButton.cloneNode(true));
  downloadButton.replaceWith(downloadButton.cloneNode(true));
  
  const newCloseButton = document.querySelector("#close-btn");
  const newDownloadButton = document.querySelector("#download-btn");

  newCloseButton.addEventListener('click', async () => {
    photoCanvas.style.display = 'none';
    videoElement.style.display = 'block';
    containerButtons.style.display = 'none';
    
    if (!currentStream) {
      await restartCamera();
    }
  });

  newDownloadButton.addEventListener('click', saveImage);

  if (containerButtons) {
    containerButtons.style.display = "flex";
  }
}

function capturePhoto() {
	const videoWidth = videoElement.videoWidth;
	const videoHeight = videoElement.videoHeight;

	photoCanvas.width = videoWidth;
	photoCanvas.height = videoHeight;

	const ctx = photoCanvas.getContext('2d');

	if (videoElement.style.filter) {
		ctx.filter = videoElement.style.filter;
	}

	if (videoElement.style.transform === 'scaleX(-1)') {
		ctx.translate(videoWidth, 0);
		ctx.scale(-1, 1);
	}

	ctx.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);

	videoElement.style.display = "none";
	photoCanvas.style.display = "block";
	cameraInfoTopRight.style.display = 'none';

	createActionButtons();
}

async function saveImage() {
  if (!currentDeviceId) {
    alert('Nenhuma câmera ativa. Por favor, inicie a câmera primeiro.');
    return;
  }

  let highResStream = null;
  try {
    const [width, height] = resolutionSize.value.split('x').map(Number);
    
    highResStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: currentDeviceId },
        width: { ideal: width },
        height: { ideal: height }
      },
      audio: false
    });

    const track = highResStream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    
    let blob;
    try {
      blob = await imageCapture.takePhoto();
    } catch (e) {
      console.warn("ImageCapture falhou, usando canvas fallback:", e);
      blob = await canvasToBlob(photoCanvas);
    }

    const imgURL = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = imgURL;
    a.download = `foto-${new Date().toISOString().slice(0, 10)}.${blob.type.includes('png') ? 'png' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(imgURL);
    }, 100);

  } catch (error) {
    console.error('Erro ao capturar imagem:', error);
    alert('Erro ao capturar imagem: ' + error.message);
  } finally {
    if (highResStream) {
      highResStream.getTracks().forEach(t => t.stop());
    }
  }
}

async function send(blob) {
	const filename = "captured-image.png"
	const form = new FormData();

	form.append("file", blob, filename);

	const response = await fetch("https://35.175.103.175/api/upload", {
		method: "POST",
		body: form,
	});
	
	console.log("Retorno: "+response.status);
}

// converter canvas em Blob via Promise
function canvasToBlob(canvas, type = 'image/png', quality = 1) {
	return new Promise((resolve) => {
		canvas.toBlob((blob) => {
			resolve(blob);
		}, type, quality);
	});
}

export async function restartCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  
  videoElement.srcObject = null;
  photoCanvas.style.display = 'none';
  videoElement.style.display = 'block';
  
  return await getCameraStream(currentDeviceId);
}

// === EVENTOS PRINCIPAIS ===
startCameraBtn.addEventListener('click', async () => {
  startCameraBtn.disabled = true;
  startCameraBtn.textContent = 'Carregando...';
  
  try {
    const success = await getCameraStream();
    if (success) {
      startCameraContainer.style.display = 'none';
    } else {
      startCameraBtn.textContent = 'Tentar novamente';
    }
  } catch (err) {
    console.error('Erro ao iniciar a câmera:', err);
    alert('Não foi possível iniciar a câmera. Por favor, verifique as permissões ou tente novamente.');
    startCameraBtn.textContent = 'Erro - Tentar novamente';
  } finally {
    startCameraBtn.disabled = false;
  }
});

shutterBtn.addEventListener('click', capturePhoto);

switchCamBtn.addEventListener('click', async () => {
  const cameras = await listCameras();
  if (cameras.length <= 1) return;
  
  const currentIndex = cameras.findIndex(c => c.deviceId === currentDeviceId);
  const nextIndex = (currentIndex + 1) % cameras.length;
  const nextCamera = cameras[nextIndex];
  
  const facingMode = nextCamera.label.toLowerCase().includes('front') ? 'user' : 'environment';
  
  await getCameraStream(nextCamera.deviceId, facingMode);
});

zoomSlider.addEventListener('input', updateZoom);
