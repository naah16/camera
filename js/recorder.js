let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let stream;

const videoElement = document.getElementById("video");
const recordPreview = document.getElementById("record-preview");
const recordBtn = document.getElementById("record-btn");


recordBtn.addEventListener("click", async () => {
  async function setupStream() {
    try {
      // Pega vídeo e áudio
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoElement.srcObject = stream;
    } catch (err) {
      console.error("Erro ao acessar a câmera e microfone:", err);
      alert("Não foi possível acessar a câmera e o microfone.");
    }
  }
  
  // Inicializa o stream assim que a página carregar
  
	if (!isRecording) {
    window.addEventListener("DOMContentLoaded", setupStream);
		if (!stream) await setupStream(); // garante que o stream foi inicializado

		mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp8,opus" });
		recordedChunks = [];

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
			recordPreview.play();

			const a = document.createElement("a");
			a.href = videoURL;
			a.download = "gravacao.webm";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		};

		mediaRecorder.start();
		isRecording = true;
		recordBtn.classList.add("recording");
	} else {
		mediaRecorder.stop();
		isRecording = false;
		recordBtn.classList.remove("recording");
	}
});
