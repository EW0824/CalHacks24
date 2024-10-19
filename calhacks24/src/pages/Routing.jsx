import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";
import HomePage from "./Homepage.jsx";
import Interview from "./Interview.jsx";

function App() {
	const [isDarkTheme, setIsDarkTheme] = useState(() => {
		// Load initial state from localStorage
		const savedTheme = localStorage.getItem("isDarkTheme");
		return savedTheme === "true"; // Convert string to boolean
	});

	useEffect(() => {
		// Store theme preference in localStorage whenever it changes
		localStorage.setItem("isDarkTheme", isDarkTheme);
	}, [isDarkTheme]);

	return (
		<Router>
			<Routes>
				<Route
					path="/"
					element={
						<HomePage
							isDarkTheme={isDarkTheme}
							setIsDarkTheme={setIsDarkTheme}
						/>
					}
				/>
				<Route
					path="/interview"
					element={
						<Interview
							isDarkTheme={isDarkTheme}
							setIsDarkTheme={setIsDarkTheme}
						/>
					}
				/>
			</Routes>
		</Router>
	);
}

export default App;
