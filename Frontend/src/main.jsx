import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./pages/Routing.jsx";
import "./index.css";
import Modal from "react-modal";

Modal.setAppElement("#root");

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
