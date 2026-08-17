import React, { useState, Children, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import './Stepper.css';

// Framer animates these as literal colour values, so they can't be `var(...)`
// like the rest of Stepper.css. Kept in sync with globals.css by hand —
// --color-accent, --color-raised, --color-body.
const ACCENT = '#8b5cf6';
const RAISED = '#1a1210';
const BODY = '#a39c97';

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  disableStepIndicators = false,
  renderStepIndicator,
  ...rest
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const isAnimatingRef = useRef(false);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  /** Guards against a step change firing again before the slide/height
   * transition for the previous one has settled — without this, clicking
   * Next (or a step indicator) again mid-transition desyncs the visible
   * content from `currentStep` (indicators/button label update immediately,
   * but the AnimatePresence-driven content pane doesn't catch up). ~450ms
   * covers this component's own 0.4s content transition with a small buffer. */
  const changeStep = (newStep, dir) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setDirection(dir);
    setCurrentStep(newStep);
    if (newStep > totalSteps) {
      onFinalStepCompleted();
    } else {
      onStepChange(newStep);
    }
    setTimeout(() => {
      isAnimatingRef.current = false;
    }, 450);
  };

  const handleBack = () => {
    if (currentStep > 1) changeStep(currentStep - 1, -1);
  };

  const handleNext = () => {
    if (!isLastStep) changeStep(currentStep + 1, 1);
  };

  const handleComplete = () => {
    changeStep(totalSteps + 1, 1);
  };

  return (
    <div className="outer-container" {...rest}>
      <div className={`step-circle-container ${stepCircleContainerClassName}`} style={{ border: '1px solid var(--color-border)' }}>
        <div className={`step-indicator-row ${stepContainerClassName}`}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: clicked => changeStep(clicked, clicked > currentStep ? 1 : -1)
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    onClickStep={clicked => changeStep(clicked, clicked > currentStep ? 1 : -1)}
                  />
                )}
                {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
              </React.Fragment>
            );
          })}
        </div>

        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          className={`step-content-default ${contentClassName}`}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {!isCompleted && (
          <div className={`footer-container ${footerClassName}`}>
            <div className={`footer-nav ${currentStep !== 1 ? 'spread' : 'end'}`}>
              {currentStep !== 1 && (
                <button
                  onClick={handleBack}
                  className={`back-button ${currentStep === 1 ? 'inactive' : ''}`}
                  {...backButtonProps}
                >
                  {backButtonText}
                </button>
              )}
              <button onClick={isLastStep ? handleComplete : handleNext} className="next-button" {...nextButtonProps}>
                {isLastStep ? 'Complete' : nextButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepContentWrapper({ isCompleted, currentStep, direction, children, className }) {
  // setParentHeight is handed to SlideTransition directly rather than wrapped in
  // an inline arrow: its ResizeObserver keys off this identity, and a fresh
  // function each render would tear the observer down and rebuild it every time.
  const [parentHeight, setParentHeight] = useState(0);

  return (
    <motion.div
      className={className}
      style={{ position: 'relative', overflow: 'hidden' }}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={{ type: 'spring', duration: 0.4 }}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideTransition key={currentStep} direction={direction} onHeightReady={setParentHeight}>
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SlideTransition({ children, direction, onHeightReady }) {
  const containerRef = useRef(null);

  // The parent clips to exactly this height (overflow: hidden), so under-
  // measuring by even a fraction of a pixel shaves the bottom border off the
  // last element. `offsetHeight` is a rounded integer and was doing exactly
  // that; getBoundingClientRect keeps the fraction, and ceil rounds the safe
  // way. Measured once synchronously for the slide-in...
  useLayoutEffect(() => {
    if (containerRef.current) {
      onHeightReady(Math.ceil(containerRef.current.getBoundingClientRect().height));
    }
  }, [children, onHeightReady]);

  // ...and tracked afterwards, because a single measurement is taken before web
  // fonts settle and before any nested enter-animation finishes. Content that
  // reflows after that point (a paragraph rewrapping, a callout expanding)
  // would otherwise stay clipped at its initial height.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      onHeightReady(Math.ceil(entry.target.getBoundingClientRect().height));
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}

const stepVariants = {
  enter: dir => ({
    x: dir >= 0 ? '-100%' : '100%',
    opacity: 0
  }),
  center: {
    x: '0%',
    opacity: 1
  },
  exit: dir => ({
    x: dir >= 0 ? '50%' : '-50%',
    opacity: 0
  })
};

export function Step({ children }) {
  return <div className="step-default">{children}</div>;
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators }) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) onClickStep(step);
  };

  return (
    <motion.div onClick={handleClick} className="step-indicator" style={disableStepIndicators ? { pointerEvents: 'none', opacity: 0.5 } : {}} animate={status} initial={false}>
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: RAISED, color: BODY },
          active: { scale: 1, backgroundColor: ACCENT, color: ACCENT },
          complete: { scale: 1, backgroundColor: ACCENT, color: ACCENT }
        }}
        transition={{ duration: 0.3 }}
        className="step-indicator-inner"
      >
        {status === 'complete' ? (
          <CheckIcon className="check-icon" />
        ) : status === 'active' ? (
          <div className="active-dot" />
        ) : (
          <span className="step-number">{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ isComplete }) {
  const lineVariants = {
    incomplete: { width: 0, backgroundColor: 'transparent' },
    complete: { width: '100%', backgroundColor: ACCENT }
  };

  return (
    <div className="step-connector">
      <motion.div
        className="step-connector-inner"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? 'complete' : 'incomplete'}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
