import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import elon from "/elon.jpg";
import oprah from "/oprah.jpeg";
import lebron from "/lebron.webp";
import zuck from "/zuck.avif";

function ChooseModal({ setSelectedPerson }) {
	const [modalIsOpen, setModalIsOpen] = useState(false);
	const [showFounderOptions, setShowFounderOptions] = useState(false);

	useEffect(() => {
		openModal();
	}, []);

	const openModal = () => setModalIsOpen(true);
	const closeModal = () => {
		setModalIsOpen(false);
		setShowFounderOptions(false); // Reset to initial state
	};

	const handleChoice = (choice) => {
		if (choice === "student") {
			setSelectedPerson("student");
			closeModal();
		} else if (choice === "founder") {
			setShowFounderOptions(true);
		} else {
			setSelectedPerson(choice);
			closeModal();
		}
	};

	return (
		<div>
			<Modal
				isOpen={modalIsOpen}
				onRequestClose={closeModal}
				contentLabel="Choose Modal"
				style={{
					overlay: {
						backgroundColor: "rgba(0, 0, 0, 0.75)",
					},
					content: {
						top: "50%",
						left: "50%",
						right: "auto",
						bottom: "auto",
						marginRight: "-50%",
						transform: "translate(-50%, -50%)",
						borderRadius: "8px",
						padding: "0",
						border: "none",
					},
				}}
			>
				<div className="p-6 bg-white rounded-lg shadow-lg">
					{!showFounderOptions ? (
						<div className="text-center">
							<h2 className="text-xl font-semibold mb-4">Choose a Role</h2>
							<div className="flex justify-around space-x-2">
								<button
									type="button"
									onClick={() => handleChoice("student")}
									className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition"
								>
									Student
								</button>
								<button
									type="button"
									onClick={() => handleChoice("founder")}
									className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition"
								>
									Founder
								</button>
							</div>
						</div>
					) : (
						<div>
							<h2 className="text-xl font-semibold text-center mb-4">
								Choose a Founder
							</h2>
							<div className="grid grid-cols-2 gap-4">
								<button
									type="button"
									onClick={() => handleChoice("elon")}
									className="flex flex-col items-center bg-gray-100 p-4 rounded-md hover:shadow-md transition"
								>
									<img
										src={elon}
										className="rounded-full mb-2"
										height={100}
										width={100}
										alt="Elon"
									/>
									<span>Elon</span>
								</button>
								<button
									type="button"
									onClick={() => handleChoice("oprah")}
									className="flex flex-col items-center bg-gray-100 p-4 rounded-md hover:shadow-md transition"
								>
									<img
										src={oprah}
										className="rounded-full mb-2"
										height={100}
										width={100}
										alt="Oprah"
									/>
									<span>Oprah</span>
								</button>
								<button
									type="button"
									onClick={() => handleChoice("lebron")}
									className="flex flex-col items-center bg-gray-100 p-4 rounded-md hover:shadow-md transition"
								>
									<img
										src={lebron}
										className="rounded-full mb-2"
										height={100}
										width={100}
										alt="LeBron"
									/>
									<span>LeBron</span>
								</button>
								<button
									type="button"
									onClick={() => handleChoice("zuck")}
									className="flex flex-col items-center bg-gray-100 p-4 rounded-md hover:shadow-md transition"
								>
									<img
										src={zuck}
										className="rounded-full mb-2"
										height={100}
										width={100}
										alt="Zuckerberg"
									/>
									<span>Zuckerberg</span>
								</button>
							</div>
						</div>
					)}
					<div className="text-center mt-6">
						<button
							type="button"
							onClick={closeModal}
							className="text-gray-600 hover:text-gray-800 rounded-md bg-red-400 px-2 py-1 transition"
						>
							Close Modal
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
}

export default ChooseModal;
