import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Shotstack Studio SDK",
	description: "Shotstack Studio SDK Next.js Demo"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
