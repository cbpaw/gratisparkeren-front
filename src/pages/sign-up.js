import React from "react";
import Meta from "components/Meta";
import AuthSection from "components/AuthSection";

function SignUpPage(props) {
  return (
    <>
      <Meta title="Sign Up" />
      <AuthSection
        size="md"
        bgColor="bg-blue-800"
        bgImage="https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?auto=format&fit=crop&w=1200&h=800&q=80"
        bgImageOpacity={0.8}
        textColor="text-white"
        type="signup"
        providers={["google", "facebook", "twitter"]}
        afterAuthPath="/dashboard"
      />
    </>
  );
}

export default SignUpPage;
