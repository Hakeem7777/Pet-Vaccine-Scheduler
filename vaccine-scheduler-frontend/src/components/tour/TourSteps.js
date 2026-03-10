// Dashboard Tour Steps - shown after the user adds their first dog
export function getDashboardTourSteps({ hasAiChat } = {}) {
  const steps = [
    {
      selector: '[data-tour="dog-list"]',
      content: {
        title: 'Your Dogs',
        description: 'Great job adding your first dog! All your registered pets will appear here. Click on any pet card to view their detailed vaccination schedule and history.',
      },
      position: 'top',
    },
    {
      selector: '[data-tour="upload-doc-btn"]',
      content: {
        title: 'Upload Vaccination Records',
        description: 'Have existing records? Upload them here and our AI will automatically extract vaccination history from your documents.',
      },
      position: 'bottom',
    },
    {
      selector: '[data-tour="add-dog-btn"]',
      content: {
        title: 'Add More Dogs',
        description: 'You can add more dogs at any time. Each dog gets their own personalized vaccination schedule.',
      },
      position: 'left',
    },
  ];

  if (hasAiChat) {
    steps.push({
      selector: '[data-tour="chat-bubble"]',
      content: {
        title: 'AI Vaccine Assistant',
        description: 'Have questions about vaccines? Our AI assistant is available 24/7 to answer your vaccination questions and provide personalized recommendations.',
      },
      position: 'left',
    });
  }

  steps.push({
    selector: '[data-tour="faq-link"]',
    content: {
      title: 'Learn More',
      description: 'Visit our FAQ section for detailed information about core vs non-core vaccines, disease prevention, and common vaccination questions.',
    },
    position: 'bottom',
  });

  return steps;
}

// Dog Detail Tour Steps - dynamically generated based on user context
export function getDogDetailTourSteps({ isPro, canExportPdf, hasAiChat } = {}) {
  const steps = [
    {
      selector: '[data-tour="dog-info-card"]',
      content: {
        title: 'Dog Profile',
        description: "Here's your dog's profile information. You can edit details or delete the profile using the buttons below.",
      },
      position: 'bottom',
    },
    {
      selector: '[data-tour="noncore-selector"]',
      content: {
        title: 'Optional Vaccines',
        description: "Select optional vaccines based on your dog's lifestyle. We've pre-selected recommendations based on their environment settings.",
      },
      position: 'bottom',
    },
    {
      selector: '[data-tour="schedule-section"]',
      content: {
        title: 'Vaccination Schedule',
        description: 'Vaccines are organized by urgency: Overdue (red), Upcoming within 30 days (orange), and Future (green). Stay on top of the red and orange items!',
      },
      position: 'right',
    },
    {
      selector: '[data-tour="schedule-item"]',
      content: {
        title: 'Vaccine Details',
        description: 'Each vaccine card shows the due date and status. Tap the card to flip it and see safety information about the vaccine.',
      },
      position: 'left',
      action: (elem) => {
        // Auto-expand the accordion so the "Mark as Done" button is visible for the next step
        if (elem) {
          const header = elem.querySelector('.schedule-accordion__header');
          if (header && header.getAttribute('aria-expanded') !== 'true') {
            header.click();
            // Wait for accordion animation to finish before reactour recalculates highlight
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, 350);
          }
        }
      },
    },
    {
      selector: '[data-tour="mark-done-btn"]',
      content: {
        title: 'Record Vaccinations',
        description: "When your dog receives a vaccine, click 'Mark as Done' to log it. This updates the schedule and calculates the next due date.",
      },
      position: 'top',
      bypassElem: true,
      actionAfter: () => {
        // Collapse the accordion back when leaving this step
        const scheduleItem = document.querySelector('[data-tour="schedule-item"]');
        if (scheduleItem) {
          const header = scheduleItem.querySelector('.schedule-accordion__header');
          if (header && header.getAttribute('aria-expanded') === 'true') {
            header.click();
          }
        }
      },
    },
  ];

  // Only include export step for users who can export
  if (isPro || canExportPdf) {
    steps.push({
      selector: '[data-tour="export-btn"]',
      content: {
        title: 'Export Schedule',
        description: 'Export your vaccination schedule to Apple Calendar, Google Calendar, PDF, or share it via email with your vet or family members.',
      },
      position: 'left',
    });
  }

  // Chat bubble step only for users with AI chat access
  if (hasAiChat) {
    steps.push({
      selector: '[data-tour="chat-bubble"]',
      content: {
        title: 'Context-Aware AI',
        description: "The AI assistant now knows about this specific dog. Ask questions like 'When is the next vaccine due?' for personalized answers.",
      },
      position: 'left',
    });
  }

  return steps;
}
