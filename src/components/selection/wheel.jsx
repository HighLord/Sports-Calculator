import "./wheel.css";
import { useEffect, useState, useRef } from "react";

function Wheel({ data, dataKey, onSelect, selectedValue }) {
	// Tracks the total wheel rotation angle
	const [rotationAngle, setRotationAngle] = useState(0);

	// Tracks which item is currently highlighted/selected
	const [activeIndex, setActiveIndex] = useState(0);

	// Reference to the circular container
	const circleRef = useRef(null);

	useEffect(() => {
		const selectedIndex = data.findIndex(
			(item) => item.value === selectedValue
        );
        if (selectedIndex >= 0 && selectedIndex !== activeIndex) {
			setActiveIndex(selectedIndex);

			const degreesPerItem = 360 / data.length;
			const targetRotation = -degreesPerItem * selectedIndex + 360;
			const adjustedRotation =
				targetRotation > 180 ? targetRotation - 360 : targetRotation;
			setRotationAngle(adjustedRotation);
		}
		//setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
	}, [data, selectedValue, activeIndex]);

	useEffect(() => {
		const circleElement = circleRef.current;
		if (!circleElement) return;

		const optionElements = circleElement.querySelectorAll(".option");
		if (!optionElements.length) return;

		// The distance in degrees between each item on the wheel
		const degreesPerItem = 360 / optionElements.length;

		optionElements.forEach((option, index) => {
			// Calculate each option's position on the wheel
			const optionAngle = degreesPerItem * index + rotationAngle;

			// Position each item around the circle
			option.style.transform = `
				rotate(${optionAngle}deg)
				translate(0, -150px)
				rotate(${-optionAngle}deg)
			`;

			// Add or remove highlight from selected item
			option.classList.toggle("selected", index === activeIndex);

			option.onclick = () => {
				const targetRotation = -degreesPerItem * index + 360;
				const adjustedRotation =
					targetRotation > 180
						? targetRotation - 360
						: targetRotation;

				setRotationAngle(adjustedRotation);
				setActiveIndex(index);

				onSelect(dataKey, data[index].value);
			};
		});
	}, [data, rotationAngle, activeIndex, dataKey, onSelect]);

	return (
		<div id="circle" className="circle" ref={circleRef}>
			{data.map((item) => (
				<div key={item.value} className="option" value={item.value}>
					{item.text}
				</div>
			))}
		</div>
	);
}

export default Wheel;
