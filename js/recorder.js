let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let stream;

const videoElement = document.getElementById("video");
const recordPreview = document.getElementById("record-preview");
const recordBtn = document.getElementById("record-btn");
const recIndicator = document.getElementById("rec-indicator");

async function setupStream() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }  },
      audio: true
    });
    
    videoElement.srcObject = stream;
  } catch (err) {
    console.error("Erro ao acessar a câmera e microfone:", err);
    alert("Não foi possível acessar a câmera e o microfone.");
  }
}

function createActionButtons() {
	const containerButtons = document.querySelector(".camera-info.top-right.close");
  const closeButton = document.querySelector("#close-btn");
  const downloadButton = document.querySelector("#download-btn");

  if (!closeButton.dataset.listenerAdded) {
    closeButton.addEventListener('click', () => {
			recordPreview.style.display = 'none';
			videoElement.style.display = 'block';
			containerButtons.style.display = 'none';
		});
		closeButton.dataset.listenerAdded = "true";
	}

	if (!downloadButton.dataset.listenerAdded) {
		downloadButton.addEventListener('click', () => {
			const blob = new Blob(recordedChunks, { type: "video/webm" });
			const videoURL = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = videoURL;
			a.download = "gravacao.webm";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		});
		downloadButton.dataset.listenerAdded = "true";
	}

	if (containerButtons) {
		containerButtons.style.display = "flex";
	}
}

recordBtn.addEventListener("click", async () => {
  
	if (!isRecording) {
    if (!stream) await setupStream();

    recordedChunks = [];

    if (!MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
      mediaRecorder = new MediaRecorder(stream);
    } else {
      mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const videoURL = URL.createObjectURL(blob);

      recordPreview.src = videoURL;
      recordPreview.style.display = "block";
      videoElement.style.display = "none";
      recordPreview.play();

			createActionButtons();
    };

    mediaRecorder.start();
    isRecording = true;
    recIndicator.style.display = "flex";
    recordBtn.classList.add("recording");

  } else {
    // Parar gravação
    mediaRecorder.stop();
    isRecording = false;
    recIndicator.style.display = "none";
    recordBtn.classList.remove("recording");
  }
});
