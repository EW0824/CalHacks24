import React from "react";
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
	// Sample data for emotions and scores
	const emotionData = {
		labels: ["Happy", "Neutral", "Sad", "Surprised", "Angry"],
		datasets: [
			{
				label: "Emotion Frequency",
				data: [30, 50, 10, 5, 5], // Example frequency data
				backgroundColor: "rgba(75, 192, 192, 0.6)",
			},
		],
	};

	const toggleTheme = () => {
		setIsDarkTheme(!isDarkTheme); // Toggle the theme
	};

	const behavioralFeedback =
		"You maintained good eye contact but appeared anxious at times. Practice will help reduce fidgeting.";
	const questionFeedback =
		"Your answers were mostly clear, but try to elaborate more on your experiences.";
	const score = 78; // Example score

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
				{/* Emotion Frequency Bar Graph */}
				<div
					className={`${isDarkTheme ? "bg-gray-800 text-white" : "bg-white"} flex-1 mb-8 shadow-md rounded-lg p-4 mr-4`}
				>
					<h2 className="text-2xl font-semibold mb-4">Emotion Frequency</h2>
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
				</div>

				{/* Feedback and Scores */}
				<div className="flex-1 mb-8">
					{/* Behavioral Feedback */}
					<div
						className={`${isDarkTheme ? "bg-gray-800 text-white" : "bg-white"} shadow-md rounded-lg p-4 mb-4`}
					>
						<h2 className="text-2xl font-semibold mb-4">Behavioral Feedback</h2>
						<p>{behavioralFeedback}</p>
					</div>

					{/* Question Answering Feedback */}
					<div
						className={`${isDarkTheme ? "bg-gray-800 text-white" : "bg-white"} shadow-md rounded-lg p-4 mb-4`}
					>
						<h2 className="text-2xl font-semibold mb-4">
							Question Answering Feedback
						</h2>
						<p>{questionFeedback}</p>
					</div>

					{/* Score Display */}
					<div
						className={`${isDarkTheme ? "bg-gray-800 text-white" : "bg-white"} shadow-md rounded-lg p-4 mb-4`}
					>
						<h2 className="text-2xl font-semibold mb-4">Score</h2>
						<p className="text-3xl">{score}/100</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Report;
