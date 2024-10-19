import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useState } from "react";
import HomePage from "./Homepage.jsx";
import Interview from "./Interview.jsx";

function App() {
	const [isDarkTheme, setIsDarkTheme] = useState(false); // State for theme toggle

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
