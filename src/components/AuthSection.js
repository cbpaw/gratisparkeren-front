import React from "react";
import Section from "components/Section";
import SectionHeader from "components/SectionHeader";
import Auth from "components/Auth";
import AuthFooter from "components/AuthFooter";

function AuthSection(props) {
  // Options by auth type
  const optionsByType = {
    signup: {
      // Top Title
      title: "Get yourself an account",
      // Button text
      buttonAction: "Sign up",
      // Footer text and links
      showFooter: true,
      signinText: "Already have an account?",
      signinAction: "Sign in",
      signinPath: "/sign-in",
      // Terms and privacy policy agreement
      showAgreement: true,
      termsPath: "/legal/terms-of-service",
      privacyPolicyPath: "/legal/privacy-policy",
    },
    signin: {
      title: "Welcome back",
      buttonAction: "Sign in",
      showFooter: true,
      signupAction: "Create an account",
      signupPath: "/sign-up",
      forgotPassAction: "Forgot Password?",
      forgotPassPath: "/auth/forgotpass",
    },
    forgotpass: {
      title: "Get a new password",
      buttonAction: "Reset password",
      showFooter: true,
      signinText: "Remember it after all?",
      signinAction: "Sign in",
      signinPath: "/sign-in",
    },
    changepass: {
      title: "Choose a new password",
      buttonAction: "Change password",
    },
  };

  // Ensure we have a valid auth type
  const type = optionsByType[props.type] ? props.type : "signup";

  // Get options object for current auth type
  const options = optionsByType[type];

  return (
    <Section
      size={props.size}
      bgColor={props.bgColor}
      bgImage={props.bgImage}
      bgImageOpacity={props.bgImageOpacity}
      textColor={props.textColor}
    >
      <div className="container max-w-md">
        <SectionHeader
          title={options.title}
          subtitle=""
          strapline=""
          className="text-center"
        />
        <div className="bg-white text-black rounded-lg p-4">
          <Auth
            type={type}
            buttonAction={options.buttonAction}
            providers={props.providers}
            afterAuthPath={props.afterAuthPath}
            key={type}
          />

          {options.showFooter && <AuthFooter type={type} {...options} />}
        </div>
      </div>
    </Section>
  );
}

export default AuthSection;
