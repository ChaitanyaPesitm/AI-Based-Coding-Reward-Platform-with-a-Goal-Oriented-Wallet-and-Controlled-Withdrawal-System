import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import Navbar from '@/components/Navbar';
import NotificationListener from '@/components/NotificationListener';
import InlineScript from '@/components/InlineScript';
import StyledJsxRegistry from './registry';

export const metadata = {
  title: 'CodeReward - AI-Based Coding Reward Platform',
  description: 'Earn reward points by solving coding problems. AI evaluates your code quality, and you can withdraw real rewards once your financial goal is met.',
  keywords: 'coding platform, AI code evaluation, reward system, goal-oriented wallet, coding practice',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <InlineScript
          html={`
            (function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()
          `}
        />
      </head>
      <body>
        <StyledJsxRegistry>
          <ThemeProvider>
            <AuthProvider>
              <Navbar />
              <NotificationListener />
              <main>{children}</main>
            </AuthProvider>
          </ThemeProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
