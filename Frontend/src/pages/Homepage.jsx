import React from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/outline";

function Homepage({ isDarkTheme, setIsDarkTheme }) {
	const toggleTheme = () => {
		setIsDarkTheme(!isDarkTheme); // Toggle the theme
	};

	return (
		<div
			className={`transition-colors duration-500 min-h-screen flex flex-col ${isDarkTheme ? "bg-gray-900 text-white" : "bg-gray-100 text-black"}`}
		>
			<header
				className={`${isDarkTheme ? "bg-gray-800" : "bg-blue-600"} w-full py-6 text-center`}
			>
				<h1 className="text-4xl font-bold text-white">Ace Your Interview</h1>
				<p className="mt-2 text-lg text-white">
					An AI-powered tool to enhance your interview skills.
				</p>
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
				<div className="mt-4">
					<a
						href="/interview"
						className={`${
							isDarkTheme
								? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
								: "bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500"
						} text-white font-bold text-lg py-3 px-5 rounded shadow-lg transition-transform duration-200 transform hover:scale-105`}
					>
						Get Started
					</a>
				</div>
			</header>

			<main className="flex-grow p-6">
				<section
					className={`max-w-4xl mx-auto ${isDarkTheme ? "bg-gray-800" : "bg-white"} shadow-md rounded-lg p-6 mb-8`}
				>
					<h2
						className={`text-3xl font-semibold ${isDarkTheme ? "text-gray-100" : "text-gray-800"} mb-4`}
					>
						Welcome to SharkProof!
					</h2>
					<p
						className={`mb-4 ${isDarkTheme ? "text-gray-300" : "text-gray-600"}`}
					>
						Prepare for your upcoming interviews with our state-of-the-art AI
						simulation. Our platform helps you practice your responses to common
						behavioral interview questions and provides feedback to help you
						improve.
					</p>
				</section>

				<section
					className={`max-w-4xl mx-auto ${isDarkTheme ? "bg-gray-800" : "bg-white"} shadow-md rounded-lg p-6 mb-8`}
				>
					<h3
						className={`text-2xl font-semibold ${isDarkTheme ? "text-gray-100" : "text-gray-800"} mb-4`}
					>
						How It Works
					</h3>
					<ul
						className={`list-disc list-inside space-y-2 ${isDarkTheme ? "text-gray-300" : "text-gray-600"}`}
					>
						<li>
							<strong>Speak to the Camera:</strong> Record your answers to
							interview questions.
						</li>
						<li>
							<strong>AI Analysis:</strong> Our AI evaluates your speech,
							emotions, and body language.
						</li>
						<li>
							<strong>Feedback:</strong> Receive detailed insights on how to
							improve your performance.
						</li>
					</ul>
				</section>

				<section
					className={`max-w-4xl mx-auto ${isDarkTheme ? "bg-gray-800" : "bg-white"} shadow-md rounded-lg p-6 mb-8`}
				>
					<h3
						className={`text-2xl font-semibold ${isDarkTheme ? "text-gray-100" : "text-gray-800"} mb-4`}
					>
						Key Features
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
						<div
							className={`${isDarkTheme ? "bg-gray-700" : "bg-blue-600"} p-4 rounded-lg shadow-md transition duration-200 hover:shadow-lg`}
						>
							<h4 className="font-bold">Real-time Analysis</h4>
							<p>Get immediate feedback on your responses and body language.</p>
						</div>
						<div
							className={`${isDarkTheme ? "bg-gray-700" : "bg-blue-600"} p-4 rounded-lg shadow-md transition duration-200 hover:shadow-lg`}
						>
							<h4 className="font-bold">Customizable Questions</h4>
							<p>
								Practice with a variety of questions tailored to your industry.
							</p>
						</div>
						<div
							className={`${isDarkTheme ? "bg-gray-700" : "bg-blue-600"} p-4 rounded-lg shadow-md transition duration-200 hover:shadow-lg`}
						>
							<h4 className="font-bold">Relevant Questions</h4>
							<p>
								Questions are based off of previous answers, providing an
								experience as close to the real deal as possible.
							</p>
						</div>
						<div
							className={`${isDarkTheme ? "bg-gray-700" : "bg-blue-600"} p-4 rounded-lg shadow-md transition duration-200 hover:shadow-lg`}
						>
							<h4 className="font-bold">Real Scenarios</h4>
							<p>
								Practice interviewing with famous investors such as Lebron
								James, Oprah Winfrey, Elon Musk and just a basic default
								interview!
							</p>
						</div>
					</div>
				</section>

				<section
					className={`max-w-4xl mx-auto ${isDarkTheme ? "bg-gray-800" : "bg-white"} shadow-md rounded-lg p-6 mb-8`}
				>
					<h3
						className={`text-2xl font-semibold ${isDarkTheme ? "text-gray-100" : "text-gray-800"} mb-4`}
					>
						Why Choose Us?
					</h3>
					<p
						className={`mb-4 ${isDarkTheme ? "text-gray-300" : "text-gray-600"}`}
					>
						Our platform combines cutting-edge technology with proven interview
						techniques to give you the edge you need to succeed in your job
						search. Whether you're a seasoned professional or just starting out,
						our simulator is designed to help you build confidence and improve
						your skills.
					</p>
				</section>
			</main>

			<footer
				className={`${isDarkTheme ? "bg-gray-800" : "bg-blue-600"} text-white w-full py-4 text-center`}
			>
				<p>&copy; 2024 Interview Simulator. All rights reserved.</p>
			</footer>
		</div>
	);
}

export default Homepage;
