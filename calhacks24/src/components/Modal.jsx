import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Modal = ({ isVisible, onClose, loading }) => {
	const navigate = useNavigate();
	const modalRef = useRef();

	const handleClose = (event) => {
		if (modalRef.current && !modalRef.current.contains(event.target)) {
			onClose(); // Close the modal if the click is outside of it
		}
	};

	useEffect(() => {
		// Add event listener for clicks outside the modal
		document.addEventListener("mousedown", handleClose);
		return () => {
			// Cleanup the event listener on component unmount
			document.removeEventListener("mousedown", handleClose);
		};
	}, []);

	if (!isVisible) return null; // Return null only after the hooks have been set up

	return (
		<div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
			<div
				ref={modalRef} // Attach ref to the modal div
				className="bg-white rounded-lg p-6 shadow-md max-w-sm mx-auto w-96 text-center relative"
			>
				<button
					type="button"
					className="absolute top-2 right-6 text-red-500"
					onClick={onClose}
					title="Close"
				>
					&times; {/* This is the "X" character */}
				</button>
				<h2 className="text-lg font-semibold">Feedback & Insights</h2>
				{loading && (
					<p className="mt-2">Please wait while we process your data...</p>
				)}
				<div className="mt-4">
					{!loading && (
						<button
							type="button"
							className="bg-blue-500 text-white px-4 py-2 rounded"
							onClick={() => {
								onClose(); // Close the modal before navigating
								navigate("/summary");
							}}
						>
							See Feedback
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default Modal;
