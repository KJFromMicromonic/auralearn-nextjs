import { SignUp } from '@clerk/clerk-react';

export default function ParentSignUp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-coral/20 via-pastel-mint/20 to-pastel-sky/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Parent Account</h1>
          <p className="text-muted-foreground">Join LearnAura as a parent</p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-card shadow-xl',
            },
          }}
          afterSignUpUrl="/auth-callback?role=parent"
          redirectUrl="/auth-callback?role=parent"
          signInUrl="/signin/parent"
        />
      </div>
    </div>
  );
}
