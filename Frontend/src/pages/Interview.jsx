import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import elon from "/elon.jpg";
import oprah from "/oprah.jpeg";
import interviewer from "/interviewer.jpg";
import zuck from "/zuck.avif";
import lebron from "/lebron.webp";
import { SunIcon, MoonIcon } from "@heroicons/react/outline"; // Install heroicons if you haven't
import Modal from "../components/Modal.jsx";
import { connectToHume, captureAudio, disconnectFromHume } from "./EVI.ts";
import { useTTS } from "@cartesia/cartesia-js/react";
import ChooseModal from "../components/ChooseModal.jsx";

const config = {
	elon: "28f6b994-cfb3-4b38-9893-1ca700df267f",
	"Peter Thiel": "eb85d26c-f6fe-4138-b548-b9d87493463c",
	"Mira Murati": "947c0352-f808-4cae-947d-a4b09a7e1329",
	zuck: "c37b188f-62b2-4747-8f65-d355afddd127",
	"Jack Ma": "0f2b77ef-bf01-45d9-beb3-b12ea8c7dfb4",
	lebron: "d660091e-01f7-4b70-b1bf-90b0ac591d94",
	oprah: "6499ba36-c1c1-4d81-88f8-725b8e761d26",
	student: "a0e99841-438c-4a64-b679-ae501e7d6091",
};

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

	// HUME
	const [conversationHistory, setConversationHistory] = useState([]); // Holds conversation history
	const [socket, setSocket] = useState(null); // Web socket
	const [startTime, setStartTime] = useState(null);
	const [userEmotionData, setUserEmotionData] = useState([]);

	const [selectedPerson, setSelectedPerson] = useState("elon");
	const mapping = {
		elon: elon,
		oprah: oprah,
		lebron: lebron,
		zuck: zuck,
		student: interviewer,
	};

	const tts = useTTS({
		apiKey: import.meta.env.VITE_CARTESIA_API_KEY,
		sampleRate: 44100,
	});

	const askQuestion = async (question) => {
		setQuestions((prev) => [...prev, question]);

		const response = await tts.buffer({
			model_id: "sonic-english",
			voice: {
				mode: "id",
				id: config[selectedPerson],
			},
			transcript: question,
		});

		await tts.play();
	};

	/*
		Handle message received from Hume
	*/
	const handleMessage = async (role, content, emotions) => {
		// Get the timestamp from startTime
		const startTime = localStorage.getItem("startTime");

		const currentTime = Date.now();
		const timestamp = startTime
			? ((currentTime - startTime) / 1000).toFixed(2)
			: "0.00";

		console.log("Received message from Hume:", {
			role,
			content,
			emotions,
			timestamp,
		});

		if (role === "assistant") {
			await askQuestion(content);
		}

		// Turn user vs assistant -> User vs Interviewer
		const newRole = role === "assistant" ? "Interviewer" : "User";
		// Push new message to the conversation history state
		setConversationHistory((prevHistory) => [
			...prevHistory,
			{ newRole, content, emotions, timestamp },
		]);

		if (role === "user") {
			setUserEmotionData((prevData) => [...prevData, { timestamp, emotions }]);
		}
	};

	useEffect(() => {
		localStorage.setItem("behavior", null);
		localStorage.setItem("feedback", null);
		localStorage.setItem("video", null);
		localStorage.setItem("responses", null);
		localStorage.setItem("score", null);
	}, []);

	// Put userEmotionData in local storage
	useEffect(() => {
		if (userEmotionData.length > 0) {
			localStorage.setItem("emotions", JSON.stringify(userEmotionData));
			console.log("Emotions data updated in local storage", userEmotionData);
		}
	}, [userEmotionData]);

	useEffect(() => {
		if (questions.length > 0) {
			localStorage.setItem("questions", JSON.stringify(questions));
			console.log("Questions data updated in local storage", questions);
		}
	}, [questions]);

	/*
	Start & Stop Video
	*/

	const startVideo = async () => {
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

	/*
	Start & Stop Recording
	*/

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
		try {
			setModalVisible(true);
			const formData = new FormData();
			formData.append("file", videoBlob, "recording.mp4");

			const voiceResponse = await axios.post(
				"http://localhost:8080/api/postVoice",
				formData,
				{
					headers: { "Content-Type": "multipart/form-data" },
				},
			);

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
					questions: JSON.parse(localStorage.getItem("questions")),
					behaviors: behaviors,
					emotions: JSON.parse(localStorage.getItem("emotions")),
					length: Object.keys(transcript).length,
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);

			const feedback = feedbackResponse.data.feedback;
			const score = feedbackResponse.data.score;

			localStorage.setItem("behavior", JSON.stringify(behaviors));
			localStorage.setItem("feedback", JSON.stringify(feedback));
			localStorage.setItem("video", URL.createObjectURL(videoBlob));
			localStorage.setItem("responses", JSON.stringify(transcript));
			localStorage.setItem("score", score);

			setLoading(false);
		} catch (error) {
			setModalVisible(false);
			console.error(error);
		}
	};

	/*
	Start & Stop Interview
	*/
	const startInterview = async () => {
		startVideo();
		const startTime = Date.now();
		setStartTime(startTime); // Begin time keepin
		localStorage.setItem("startTime", startTime);
		console.log("Start time is ", startTime); // for debug
		await connectToHume(
			selectedPerson === "student" ? "student" : "founder",
			setSocket,
			handleMessage,
		);
		setIsInterviewing(true); // Update state to indicate interview is in progress
	};

	const stopInterview = () => {
		stopRecording(); // Stop recording when interview stops
		stopVideo();
		disconnectFromHume();
		setIsInterviewing(false); // Update state to indicate interview has ended

		// Send list of emotions to the backend
		sendEmotionsToBackend(localStorage.getItem("emotions"));
	};

	const sendEmotionsToBackend = async (emotions) => {
		try {
			await fetch("http://localhost:8080/api/postFeedback", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(emotions),
			});
			console.log("Emotions data sent to backend", emotions);
		} catch (error) {
			console.error("Failed to send emotions data to backend: ", error);
		}
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

	useEffect(() => {
		if (socket) {
			captureAudio(socket);
		}
	}, [socket]);

	return (
		<div
			className={`transition-colors duration-500 min-h-screen flex flex-col items-center ${isDarkTheme ? "bg-gray-900" : "bg-gray-100"}`}
		>
			<ChooseModal setSelectedPerson={setSelectedPerson} />

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
				<h1 className="text-white text-3xl font-bold mb-4">Interview</h1>
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
						src={mapping[selectedPerson]}
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

				<div>
					{/* Display conversation history */}
					{conversationHistory.map((message) => (
						<p key={message}>
							<strong>{message.newRole}:</strong> {message.content}
						</p>
					))}
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
