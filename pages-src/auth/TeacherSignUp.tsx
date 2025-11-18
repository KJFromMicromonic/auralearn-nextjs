import { SignUp } from '@clerk/clerk-react';

export default function TeacherSignUp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-coral/20 via-pastel-mint/20 to-pastel-sky/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Teacher Account</h1>
          <p className="text-muted-foreground">Join LearnAura as a teacher</p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-card shadow-xl',
            },
          }}
          afterSignUpUrl="/auth-callback?role=teacher"
          redirectUrl="/auth-callback?role=teacher"
          signInUrl="/signin/teacher"
        />
      </div>
    </div>
  );
}
