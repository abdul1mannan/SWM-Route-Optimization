import './globals.css';

export const metadata = {
  title: 'IIT Dhanbad Waste Management System',
  description: 'A system for managing waste collection and optimizing collection routes in IIT Dhanbad campus',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
