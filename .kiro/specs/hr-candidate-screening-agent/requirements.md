# Requirements Document

## Introduction

The HR Candidate Screening Agent is an AI-powered web application that automates the process of screening job applicants. Built on a React/TypeScript frontend (Vite) with an Express backend, it allows HR users to upload CVs, score candidates against a job description using Google Gemini AI, rank results, schedule interviews, and dispatch notifications via email. The goal is to eliminate the manual effort HR teams spend reviewing irrelevant applications by providing an autonomous, ranked shortlist with one-click interview scheduling.

## Glossary

- **Agent**: The autonomous AI orchestration layer (Express backend + Gemini AI) that coordinates CV parsing, scoring, scheduling, and notifications.
- **CV_Parser**: The server-side component that extracts text from uploaded CV files (PDF or TXT) and sends it to the Scoring_Engine.
- **Scoring_Engine**: The Gemini AI component that evaluates a candidate's extracted CV text against a Job_Description and produces a structured Candidate_Profile.
- **Ranking_System**: The frontend component that orders Candidate_Profiles by Score in descending order.
- **Scheduler**: The server-side component that creates interview invitations and dispatches them via email using Nodemailer.
- **Notification_Service**: The component that dispatches messages via email (Nodemailer/Gmail SMTP).
- **Candidate**: A job applicant whose CV has been uploaded and processed.
- **Candidate_Profile**: A structured data object containing a candidate's name, email, detected skills, match score, and AI summary.
- **HR_User**: An authenticated human resources team member who manages job descriptions and reviews ranked candidates.
- **Job_Description**: A free-text description of an open role including required skills and experience, entered by the HR_User.
- **Score**: An integer between 0 and 100 representing how well a Candidate's CV matches a Job_Description.
- **Threshold**: The minimum Score required for a Candidate to be considered qualified for an interview.

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As an HR_User, I want access to the screening system to be restricted to authenticated users, so that candidate data remains secure.

#### Acceptance Criteria

1. THE Agent SHALL use Clerk as the sole identity provider for all HR_User authentication.
2. WHEN an unauthenticated user accesses the application, THE Agent SHALL display a sign-in or sign-up form before granting access to any screening functionality.
3. WHEN an authenticated HR_User is signed in, THE Agent SHALL display the screening dashboard and all associated controls.
4. WHEN an HR_User signs out, THE Agent SHALL immediately revoke access to the dashboard and return the user to the authentication screen.

---

### Requirement 2: Job Description Entry

**User Story:** As an HR_User, I want to enter a job description before uploading CVs, so that the Scoring_Engine has the context needed to evaluate candidates accurately.

#### Acceptance Criteria

1. THE Agent SHALL provide a text input area for the HR_User to enter a Job_Description.
2. WHEN a CV upload is attempted without a Job_Description, THE Agent SHALL reject the upload and display a descriptive error message to the HR_User.
3. THE Agent SHALL preserve the Job_Description in the input area across multiple CV uploads within the same session.

---

### Requirement 3: CV Upload

**User Story:** As an HR_User, I want to upload CV files for a job posting, so that the Agent can process them automatically.

#### Acceptance Criteria

1. THE Agent SHALL accept CV uploads in PDF and plain text (TXT) formats.
2. WHEN a CV file is uploaded, THE Agent SHALL display a processing indicator to the HR_User within 1 second of upload initiation.
3. IF a CV file is in an unsupported format, THEN THE Agent SHALL reject the upload and return a descriptive error message to the HR_User.
4. IF the CV upload or processing request fails, THEN THE Agent SHALL display a descriptive error message to the HR_User and reset the upload control.
5. WHEN processing is complete, THE Agent SHALL reset the file upload control to allow subsequent uploads without a page refresh.

---

### Requirement 4: CV Parsing

**User Story:** As an HR_User, I want the system to extract structured information from CVs, so that candidate data can be evaluated consistently.

#### Acceptance Criteria

1. WHEN a PDF CV is uploaded, THE CV_Parser SHALL extract the full text content from the PDF binary using a PDF parsing library.
2. WHEN a TXT CV is uploaded, THE CV_Parser SHALL read the file content as UTF-8 encoded text.
3. THE CV_Parser SHALL pass the extracted text and the associated Job_Description to the Scoring_Engine as a combined prompt.
4. IF the CV_Parser cannot extract text from a PDF file, THEN THE CV_Parser SHALL return a descriptive error to the Agent and halt processing for that file.
5. THE CV_Parser SHALL produce extracted text that, when passed to the Scoring_Engine, results in a valid Candidate_Profile (round-trip: upload → parse → score → structured profile).

---

### Requirement 5: AI Scoring

**User Story:** As an HR_User, I want each candidate to receive a score based on how well their CV matches the job requirements, so that I can focus on the most relevant applicants.

#### Acceptance Criteria

1. WHEN extracted CV text and a Job_Description are submitted, THE Scoring_Engine SHALL return a Candidate_Profile containing: candidate name, candidate email, a list of detected skills, an integer Score between 0 and 100, and a 2–3 sentence AI summary.
2. THE Scoring_Engine SHALL base the Score on the degree of skills match, experience relevance, and qualifications alignment between the CV text and the Job_Description.
3. WHEN the Scoring_Engine cannot parse a valid JSON Candidate_Profile from the AI response, THE Scoring_Engine SHALL return a 500 error with a descriptive message to the Agent.
4. IF the CV text contains no identifiable candidate name, THEN THE Scoring_Engine SHALL set the candidateName field to "Unknown".
5. IF the CV text contains no identifiable email address, THEN THE Scoring_Engine SHALL set the candidateEmail field to "Not Provided".
6. THE Scoring_Engine SHALL complete scoring for a single Candidate within 30 seconds.

---

### Requirement 6: Candidate Ranking

**User Story:** As an HR_User, I want candidates to be ranked by their score for each job posting, so that I can review the best matches first.

#### Acceptance Criteria

1. WHEN a new Candidate_Profile is added to the results list, THE Ranking_System SHALL insert it such that all Candidate_Profiles are ordered by Score in descending order.
2. THE Ranking_System SHALL display all Candidate_Profiles regardless of their Score value.
3. WHEN two Candidate_Profiles have equal Scores, THE Ranking_System SHALL preserve their relative order based on upload sequence (earlier upload appears first).
4. THE Ranking_System SHALL visually distinguish Score ranges: scores of 80 or above SHALL be displayed in green, scores between 50 and 79 SHALL be displayed in yellow, and scores below 50 SHALL be displayed in red.
5. THE Ranking_System SHALL display the total count of scored Candidate_Profiles to the HR_User.

---

### Requirement 7: Candidate Management

**User Story:** As an HR_User, I want to remove individual candidates from the results list, so that I can keep the workspace focused on relevant applicants.

#### Acceptance Criteria

1. THE Agent SHALL provide a remove control for each Candidate_Profile in the ranked list.
2. WHEN the HR_User activates the remove control for a Candidate_Profile, THE Ranking_System SHALL remove that Candidate_Profile from the displayed list immediately.
3. WHEN a Candidate_Profile is removed, THE Ranking_System SHALL update the total count of scored Candidate_Profiles.

---

### Requirement 8: Interview Scheduling

**User Story:** As an HR_User, I want to schedule an interview for a qualified candidate with a single action, so that I do not need to coordinate manually.

#### Acceptance Criteria

1. THE Agent SHALL provide a schedule control for each Candidate_Profile that has a valid email address.
2. WHEN the schedule control is activated for a Candidate_Profile, THE Agent SHALL display a scheduling form pre-populated with the Candidate's name and email address.
3. THE scheduling form SHALL require the HR_User to provide an interview date and time before submission.
4. WHEN a valid scheduling form is submitted, THE Scheduler SHALL dispatch an interview invitation email to the Candidate's email address containing the Candidate's name, interview date, and interview time.
5. WHEN the interview invitation email is sent successfully, THE Agent SHALL display a success confirmation to the HR_User and close the scheduling form after 3 seconds.
6. IF the Candidate_Profile has no valid email address, THEN THE Agent SHALL disable the schedule control for that Candidate_Profile.
7. IF the Scheduler fails to send the invitation email, THEN THE Agent SHALL display a descriptive error message to the HR_User within the scheduling form.

---

### Requirement 9: Email Notification Delivery

**User Story:** As an HR_User, I want interview invitation emails to be delivered reliably to candidates, so that scheduling is not disrupted by transient failures.

#### Acceptance Criteria

1. THE Notification_Service SHALL use Gmail SMTP via Nodemailer to deliver all outbound emails.
2. WHEN an interview invitation is dispatched, THE Notification_Service SHALL send an email containing: a greeting with the Candidate's name, the interview date and time, and a request to confirm availability.
3. THE Notification_Service SHALL send emails from the configured sender address defined in the server environment configuration.
4. IF the SMTP connection fails, THEN THE Notification_Service SHALL return a 500 error with a descriptive message to the Scheduler.
5. THE Notification_Service SHALL deliver interview invitation emails in both plain text and HTML formats.
