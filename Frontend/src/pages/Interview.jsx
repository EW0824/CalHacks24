import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import interviewerImage from "/interviewer.jpg"; // Ensure this path is correct
import { SunIcon, MoonIcon } from "@heroicons/react/outline"; // Install heroicons if you haven't
import Modal from "../components/Modal.jsx";

// could be interviewer based for practice
// could be for companies to evaluate people
const Interview = ({ isDarkTheme, setIsDarkTheme }) => {
	const [isModalVisible, setModalVisible] = useState(false); // State to control modal visibility
	const videoRef = useRef(null); // Create a ref to the video element
	const mediaRecorderRef = useRef(null); // Ref for MediaRecorder
	const [isInterviewing, setIsInterviewing] = useState(false); // State to manage interview status
	const mediaStream = useRef(null); // Store media stream reference
	const [loading, setLoading] = useState(true);
	const [questions, setQuestions] = useState([]);

	const askQuestion = async (question) => {
		try {
			setQuestions((prev) => [...prev, question]);

			const response = await axios.post(
				"http://localhost:8080/api/speak",
				{ question: question },
				{
					headers: {
						"Content-Type": "application/json",
					},
					responseType: "arraybuffer", // Ensure response is treated as binary data
				},
			);

			// Create a blob from the response data and save it for manual testing
			const audioBlob = new Blob([response.data], { type: "audio/wav" });
			const audioUrl = URL.createObjectURL(audioBlob);

			const audio = new Audio(audioUrl);
			audio.play();
		} catch (error) {
			console.error("Error playing audio:", error);
		}
	};

	const startVideo = async () => {
		localStorage.setItem("behavior", null);
		localStorage.setItem("behaviorFeedback", null);
		localStorage.setItem("qaFeedback", null);
		localStorage.setItem("score", null);
		localStorage.setItem("video", null);
		localStorage.setItem("questions", null);
		localStorage.setItem("responses", null);
		try {
			mediaStream.current = await navigator.mediaDevices.getUserMedia({
				video: true, // Request video stream
				audio: true,
			});
			if (videoRef.current) {
				videoRef.current.srcObject = mediaStream.current; // Set the video stream to the video element
			}
		} catch (err) {
			console.error("Error accessing webcam: ", err);
		}
	};

	const stopVideo = () => {
		if (mediaStream.current) {
			const tracks = mediaStream.current.getTracks();
			for (const track of tracks) track.stop();
		}
		if (videoRef.current) {
			videoRef.current.srcObject = null; // Clear video stream
		}
	};

	const startRecording = () => {
		const webcamVideo = videoRef.current;
		if (webcamVideo?.srcObject) {
			const stream = webcamVideo.srcObject;
			mediaRecorderRef.current = new MediaRecorder(stream, {
				mimeType: "video/mp4",
			});

			mediaRecorderRef.current.ondataavailable = handleDataAvailable;

			if (mediaRecorderRef.current.state === "inactive") {
				mediaRecorderRef.current.start();
				console.log("Recording started");
			}
		} else {
			console.error("Webcam stream is not available.");
		}
	};

	const stopRecording = () => {
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state === "recording"
		) {
			mediaRecorderRef.current.stop();
			console.log("Recording stopped");
		}
	};

	const handleDataAvailable = async (event) => {
		if (event.data.size > 0) {
			// Call the function to upload the video
			await uploadVideo(event.data);
		}
	};

	const uploadVideo = async (videoBlob) => {
		setModalVisible(true); // Show the modal when starting the upload
		try {
			const formData = new FormData();
			formData.append("file", videoBlob, "recording.mp4");

			const voiceResponse = await axios.post(
				"http://localhost:8080/api/postVoice",
				formData,
				{
					headers: { "Content-Type": "multipart/form-data" },
				},
			);
			console.log(voiceResponse);

			setLoading(false);

			const transcript = voiceResponse.data.transcription || "no response";

			const behaviors = {};
			for (const val of voiceResponse.data.behavior) {
				const name = val[0];
				const confidence = val[1];

				// Initialize if the key doesn't exist
				if (!behaviors[name]) {
					behaviors[name] = {
						sum: 0,
						count: 0,
					};
				}

				// Accumulate the sum and count of confidences
				behaviors[name].sum += confidence;
				behaviors[name].count += 1;
			}

			// Calculate the average for each key
			for (const key in behaviors) {
				behaviors[key] = behaviors[key].sum / behaviors[key].count;
			}

			const feedbackResponse = await axios.post(
				"http://localhost:8080/api/postFeedback",
				JSON.stringify({
					transcript: transcript,
					questions: questions,
					behaviors: behaviors,
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);

			const behaviorFeedback = feedbackResponse.data.behaviorFeedback;
			const qaFeedback = feedbackResponse.data.qaFeedback;
			const score = feedbackResponse.data.score;

			localStorage.setItem("behavior", JSON.stringify(behaviors));
			localStorage.setItem("behaviorFeedback", behaviorFeedback);
			localStorage.setItem("qaFeedback", qaFeedback);
			localStorage.setItem("score", score);
			localStorage.setItem("video", URL.createObjectURL(videoBlob));
			localStorage.setItem("questions", questions);
			localStorage.setItem("responses", JSON.stringify(transcript));
		} catch (error) {
			setModalVisible(false);
			console.error(error);
		}
	};

	const startInterview = () => {
		startVideo();
		setIsInterviewing(true); // Update state to indicate interview is in progress
	};

	const stopInterview = () => {
		stopRecording(); // Stop recording when interview stops
		stopVideo();
		setIsInterviewing(false); // Update state to indicate interview has ended
	};

	const toggleTheme = () => {
		setIsDarkTheme(!isDarkTheme); // Toggle the theme
	};

	useEffect(() => {
		const webcamVideo = videoRef.current;

		const handleCanPlay = () => {
			if (isInterviewing) {
				startRecording(); // Start recording when the video is ready and interview is active
			}
		};

		if (webcamVideo) {
			webcamVideo.addEventListener("canplay", handleCanPlay);
		}

		return () => {
			if (webcamVideo) {
				webcamVideo.removeEventListener("canplay", handleCanPlay); // Cleanup the event listener
			}
		};
	}, [isInterviewing]); // Re-run effect when isInterviewing changes

	useEffect(() => {
		return () => {
			stopVideo(); // Cleanup on unmount
		};
	}, []);

	return (
		<div
			className={`transition-colors duration-500 min-h-screen flex flex-col items-center ${isDarkTheme ? "bg-gray-900" : "bg-gray-100"}`}
		>
			{/* Back Button */}
			<a href="/" className="absolute top-4 left-4 cursor-pointer">
				<button
					type="button"
					className="bg-white text-black py-2 px-4 rounded text-lg font-semibold hover:bg-gray-300 duration-200 hover:scale-125 active:scale-100"
					title="Go Back"
				>
					&#8592;
				</button>
			</a>
			<header
				className={`${isDarkTheme ? "bg-gray-800" : "bg-blue-600"} w-full py-6 text-center`}
			>
				<h1 className="text-white text-3xl font-bold mb-4">
					Interview Simulation
				</h1>
				<button
					type="button"
					className="absolute top-4 right-4 cursor-pointer"
					onClick={toggleTheme}
				>
					{isDarkTheme ? (
						<MoonIcon className="h-6 w-6 text-yellow-300" />
					) : (
						<SunIcon className="h-6 w-6 text-yellow-500" />
					)}
				</button>
			</header>

			<div
				className={`relative w-full max-w-4xl ${isDarkTheme ? "bg-gray-900" : "bg-white"} shadow-md rounded-lg mb-4 m-6`}
			>
				{/* Interviewer Box */}
				<div className="flex justify-center items-center h-[500px]">
					<img
						src={interviewerImage}
						alt="Interviewer"
						className="w-full h-full object-cover rounded-lg"
					/>
				</div>

				<Modal
					loading={loading}
					isVisible={isModalVisible}
					onClose={() => setModalVisible(false)} // Close the modal and navigate to summary
				/>

				{/* User Video Feed */}
				<div className="absolute top-4 right-4 w-48 h-48 border border-gray-300 rounded-lg overflow-hidden">
					<video
						ref={videoRef} // Attach the ref to the video element
						className="w-full h-full object-cover"
						autoPlay
						playsInline
						muted
					>
						Your browser does not support the video tag.
					</video>
				</div>
			</div>

			<div className="text-center">
				<p
					className={`mb-4 ${isDarkTheme ? "text-gray-300" : "text-gray-600"}`}
				>
					Speak your answers to the questions posed by the interviewer. Your
					responses will be analyzed.
				</p>
				<button
					type="button"
					className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
					onClick={isInterviewing ? stopInterview : startInterview} // Toggle function
				>
					{isInterviewing ? "Stop Interview" : "Start Interview"}{" "}
					{/* Change button text */}
				</button>
			</div>
		</div>
	);
};

export default Interview;
