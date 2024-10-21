import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
} from "chart.js";
import { SunIcon, MoonIcon } from "@heroicons/react/outline"; // Install heroicons if you haven't

// Register the required components
ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
);

const Report = ({ isDarkTheme, setIsDarkTheme }) => {
	const [behaviors, setBehaviors] = useState({});
	const [video, setVideo] = useState(null);
	const [questions, setQuestions] = useState([]);
	const [response, setResponse] = useState([]);
	const [feedback, setFeedback] = useState([]);
	const [score, setScore] = useState(0);

	useEffect(() => {
		try {
			setBehaviors(JSON.parse(localStorage.getItem("behavior")));
			setFeedback(JSON.parse(localStorage.getItem("feedback")));
			setVideo(localStorage.getItem("video"));
			// setScore(localStorage.getItem("score"));
			const q = JSON.parse(localStorage.getItem("questions"));
			const res = JSON.parse(localStorage.getItem("responses"));

			const feedback = JSON.parse(localStorage.getItem("feedback"));
			if (Array.isArray(feedback)) {
				let count = 0;
				let tempScore = 0;
				for (let r of feedback) {
					r = r.toLowerCase();
					const parts = r.split("score:"); // split string by "score:" delimiter
					console.log(parts);
					if (parts.length > 1) {
						const scoreText = parts[1].trim().split(" ")[0];
						const s = Number.parseInt(scoreText, 10);
						if (s > 0) {
							count++;
							tempScore += s;
						}
					}
				}
				tempScore /= count;
				setScore(tempScore);
			}

			const responsesArray = res?.map((r) => Object.values(r).join("\n"));
			setResponse(responsesArray);

			const questionsArray = q.map((question) => question);
			setQuestions(questionsArray);
		} catch (error) {
			console.error(error);
		}
	}, []);

	// Sample data for emotions and scores
	let emotionData;
	if (behaviors) {
		emotionData = {
			labels: Object.keys(behaviors),
			datasets: [
				{
					label: "Behavior Frequency",
					data: Object.values(behaviors),
					backgroundColor: "rgba(75, 192, 192, 0.6)",
				},
			],
		};
	}

	const toggleTheme = () => {
		setIsDarkTheme(!isDarkTheme); // Toggle the theme
	};

	return (
		<div
			className={`transition-colors duration-500 bg-gray-100 min-h-screen ${isDarkTheme ? "bg-gray-900" : "bg-gray-100"}`}
		>
			<header
				className={`${isDarkTheme ? "bg-gray-800" : "bg-blue-600"} w-full py-6 text-center`}
			>
				<a href="/interview" className="absolute top-4 left-4 cursor-pointer">
					<button
						type="button"
						className="bg-white text-black py-2 px-4 rounded text-lg font-semibold hover:bg-gray-300 duration-200 hover:scale-125 active:scale-100"
						title="Go Back"
					>
						&#8592;
					</button>
				</a>
				<h1 className="text-white text-3xl font-bold mb-4">Interview Report</h1>
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

			<div className="flex flex-col md:flex-row p-6">
				{/* Left Side: Emotion Frequency and Questions/Response */}
				<div className="flex-1 mb-8 md:mr-4">
					{/* Emotion Frequency Bar Graph */}
					<div
						className={`${isDarkTheme ? "bg-gray-800 text-white" : "bg-white"} shadow-md rounded-lg p-4 mb-4`}
					>
						<h2 className="text-2xl font-semibold mb-4">Behavior Frequency</h2>
						{emotionData && (
							<Bar
								data={emotionData}
								options={{
									responsive: true,
									scales: {
										y: {
											beginAtZero: true,
											ticks: {
												autoSkip: true,
												maxTicksLimit: 5,
											},
										},
									},
								}}
								height={200} // Set the height of the chart
							/>
						)}
					</div>

					{/* Questions Component */}
					<div
						className={`${isDarkTheme ? "text-white bg-gray-800" : "text-black bg-white"}  shadow-md rounded-lg p-4 mb-4`}
					>
						<h2 className="text-2xl font-semibold mb-4">Questions</h2>
						<div>
							{questions?.map((q, i) => (
								<ul key={q}>
									<li>
										{i + 1}. {q}
									</li>
								</ul>
							))}
						</div>
					</div>

					{/* Response Component */}
					<div
						className={`${isDarkTheme ? "text-white bg-gray-800" : "text-black bg-white"}  shadow-md rounded-lg p-4`}
					>
						<h2 className="text-2xl font-semibold mb-4">Response</h2>
						<div>
							{response?.map((q, i) => (
								<ul key={q}>
									<li>
										{i + 1}. {q}
									</li>
								</ul>
							))}
						</div>
					</div>
				</div>

				{/* Right Side: Video and Feedbacks */}
				<div className="flex-1 mb-8">
					{/* Video Component */}
					<div className="flex flex-col items-center mb-4">
						<h2
							className={`${isDarkTheme ? "text-white" : "text-black"} text-2xl font-semibold mb-4`}
						>
							Interview Video
						</h2>
						{video ? (
							<video
								controls
								className="rounded-lg shadow-md"
								width="640"
								height="360"
							>
								<source src={video} type="video/mp4" />
								Your browser does not support the video tag.
							</video>
						) : (
							<p>No video available.</p>
						)}
					</div>

					{/* Behavioral Feedback */}
					<div
						className={`${isDarkTheme ? "bg-gray-800 text-white" : "bg-white"} shadow-md rounded-lg p-4 mb-4`}
					>
						<h2 className="text-2xl font-semibold mb-4">Feedback</h2>
						<div>
							<FeedbackList feedback={feedback} />
						</div>
					</div>

					<div
						className={`${isDarkTheme ? "bg-gray-800 text-white" : "bg-white"} shadow-md rounded-lg p-4 mb-4`}
					>
						<h2 className="text-2xl font-semibold mb-4">Score</h2>
						<div>{Math.round(score)}/100</div>
					</div>
				</div>
			</div>
		</div>
	);
};

const FeedbackList = ({ feedback }) => {
	const [expandedIndex, setExpandedIndex] = useState(null);

	const toggleExpand = (index) => {
		if (expandedIndex === index) {
			setExpandedIndex(null); // Collapse if the same index is clicked again
		} else {
			setExpandedIndex(index); // Expand the selected index
		}
	};

	return (
		<div>
			<ul>
				{feedback?.map((val, i) => (
					<li key={val} className="my-2">
						{/* Toggle button */}
						<button
							type="button"
							onClick={() => toggleExpand(i)}
							className="text-left w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 transition duration-200"
						>
							{i + 1}. Question {i + 1}
						</button>

						{/* Show feedback if expanded */}
						{expandedIndex === i && (
							<div className="p-4 bg-gray-100 border rounded mt-2">{val}</div>
						)}
					</li>
				))}
			</ul>
		</div>
	);
};

export default Report;
