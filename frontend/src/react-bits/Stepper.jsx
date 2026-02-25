import React, { useState, Children, useRef, useLayoutEffect } from "react";
import { motion as Motion, AnimatePresence } from "motion/react";

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepCircleContainerClassName = "",
  stepContainerClassName = "",
  contentClassName = "",
  footerClassName = "",
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = "Back",
  nextButtonText = "Continue",
  disableStepIndicators = false,
  renderStepIndicator,
  ...rest
}) {
  const [completedSteps, setCompletedSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const activeStep = stepsArray[currentStep - 1];

  const updateStep = (newStep) => {
    setCurrentStep(newStep);
    if (newStep > totalSteps) onFinalStepCompleted();
    else onStepChange(newStep);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = async () => {
    if (!isLastStep) {
      if (activeStep.props.onNext) {
        const canProceed = await activeStep.props.onNext();
        if (!canProceed) return;
      }
      setDirection(1);
      updateStep(currentStep + 1);
      setCompletedSteps((prev) => Math.max(prev, currentStep));
    }
  };

  const handleComplete = () => {
    setDirection(1);
    updateStep(totalSteps + 1);
    setCompletedSteps(totalSteps);
  };

  return (
    <div className="flex flex-col items-center p-4 mt-2.5 " {...rest}>
      <div className={`w-full max-w-5xl ${stepCircleContainerClassName}`}>
        <div
          className={`${stepContainerClassName} flex w-full items-center pb-8 px-8`}
        >
          {stepsArray.map((stepElement, index) => {
            const stepNumber = index + 1;
            const label = stepElement.props.stepLabel;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: (clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    },
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    completedSteps={completedSteps}
                    onClickStep={async (clicked) => {
                      if (clicked <= completedSteps + 2) {
                        if (activeStep.props.onNext) {
                          const canProceed = await activeStep.props.onNext();
                          if (!canProceed) return;
                        }
                        setDirection(clicked > currentStep ? 1 : -1);
                        updateStep(clicked);
                        setCompletedSteps((prev) =>
                          Math.max(prev, currentStep),
                        );
                      }
                    }}
                    stepLabel={label}
                    isNextDisabled={activeStep?.props?.isNextDisabled}
                    isPending={activeStep?.props?.isPending}
                  />
                )}
                {isNotLastStep && (
                  <StepConnector isComplete={currentStep > stepNumber} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          className={`px-8 ${contentClassName}`}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>
        {!isCompleted && (
          <div className={`mx-8 ${footerClassName}`}>
            <div
              className={`sm:mb-2.5 flex ${
                currentStep !== 1
                  ? "justify-between pb-18 sm:pb-0"
                  : "justify-end mt-6"
              }`}
            >
              {currentStep !== 1 && (
                <button
                  onClick={handleBack}
                  className={`duration-350 rounded px-2 py-1 transition cursor-pointer ${
                    currentStep === 1
                      ? "pointer-events-none opacity-50 text-neutral-400"
                      : "text-neutral-400 hover:text-neutral-700"
                  }`}
                  {...backButtonProps}
                >
                  {backButtonText}
                </button>
              )}
              <button
                onClick={isLastStep ? handleComplete : handleNext}
                disabled={
                  activeStep.props.isPending || activeStep.props.isNextDisabled
                }
                className="duration-350 flex items-center justify-center rounded-full bg-primary-500 py-1.5 px-3.5 font-medium tracking-tight text-white transition hover:bg-primary-600 active:bg-primary-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500 disabled:active:bg-primary-500"
                {...nextButtonProps}
              >
                {isLastStep ? "Start Scanning" : nextButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepContentWrapper({
  isCompleted,
  currentStep,
  direction,
  children,
  className,
}) {
  const [parentHeight, setParentHeight] = useState(0);

  return (
    <Motion.div
      style={{ position: "relative", overflow: "hidden" }}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={{ type: "spring", duration: 0.8 }}
      className={`w-full ${className}`}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideTransition
            key={currentStep}
            direction={direction}
            onHeightReady={(h) => setParentHeight(h)}
          >
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}

function SlideTransition({ children, direction, onHeightReady }) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    if (containerRef.current) onHeightReady(containerRef.current.offsetHeight);
  }, [children, onHeightReady]);

  return (
    <Motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        overflow: "hidden",
      }}
    >
      {children}
    </Motion.div>
  );
}

const stepVariants = {
  enter: (dir) => ({
    x: dir >= 0 ? "-100%" : "100%",
    opacity: 0,
  }),
  center: {
    x: "0%",
    opacity: 1,
  },
  exit: (dir) => ({
    x: dir >= 0 ? "50%" : "-50%",
    opacity: 0,
  }),
};

export function Step({ children, stepLabel }) {
  return (
    <div step-label={stepLabel} className="px-8">
      {children}
    </div>
  );
}

function StepIndicator({
  step,
  currentStep,
  onClickStep,
  disableStepIndicators,
  completedSteps,
  stepLabel,
  isNextDisabled,
  isPending,
}) {
  const status =
    currentStep === step
      ? "active"
      : currentStep < step
        ? "inactive"
        : "complete";

  const isLocked = step > completedSteps + 2 || isPending;

  const handleClick = () => {
    if (
      step !== currentStep &&
      !disableStepIndicators &&
      !isLocked &&
      !isNextDisabled
    )
      onClickStep(step);
  };

  return (
    <div className="flex flex-col gap-1 items-center justify-center">
      <Motion.div
        onClick={handleClick}
        className={`relative outline-none focus:outline-none ${
          isLocked || (isNextDisabled && step !== currentStep)
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer"
        }`}
        animate={status}
        initial={false}
      >
        <Motion.div
          variants={{
            inactive: { scale: 1, backgroundColor: "#222", color: "#a3a3a3" },
            active: { scale: 1, backgroundColor: "#5B247A", color: "#5B247A" },
            complete: {
              scale: 1,
              backgroundColor: "#5B247A",
              color: "#3b82f6",
            },
          }}
          transition={{ duration: 0.3 }}
          className="flex h-8 w-8 items-center justify-center rounded-full font-semibold "
        >
          {status === "complete" ? (
            <CheckIcon className="h-4 w-4 text-black" />
          ) : status === "active" ? (
            <div className="h-3 w-3 rounded-full bg-[#060010]" />
          ) : (
            <span className="text-sm">{step}</span>
          )}
        </Motion.div>
      </Motion.div>
      <div>
        {stepLabel && <p className="text-xs text-center">{stepLabel}</p>}
      </div>
    </div>
  );
}

function StepConnector({ isComplete }) {
  const lineVariants = {
    incomplete: { width: 0, backgroundColor: "rgba(0,0,0,0)" },
    complete: { width: "100%", backgroundColor: "#fff" },
  };

  return (
    <div className="relative mx-2 h-0.5 flex-1 rounded bg-neutral-600">
      <Motion.div
        className="absolute left-0 top-0 h-full "
        variants={lineVariants}
        initial={false}
        animate={isComplete ? "complete" : "incomplete"}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <Motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          delay: 0.1,
          type: "tween",
          ease: "easeOut",
          duration: 0.3,
        }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
