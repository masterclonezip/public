export const DEFAULT_DISCLAIMER_HTML = ``;
export const DEFAULT_ETHICS_HTML = ``;
export const DEFAULT_PRIVACY_HTML = ``;
export const DEFAULT_TERMS_HTML = ``;
export const DEFAULT_RESPONSIBILITY_HTML = ``;
export const DEFAULT_REPORT_REMOVAL_HTML = ``;
export const DEFAULT_NOTICE_HTML = ``;
export const DEFAULT_ABOUT_HTML = ``;

export function ensureDefaultSettings(settings: any = {}): any {
  const s = { ...settings };
  if (s.disclaimer_text === undefined) s.disclaimer_text = "";
  if (s.ethics_discrimination_text === undefined) s.ethics_discrimination_text = "";
  if (s.privacy_content === undefined) s.privacy_content = "";
  if (s.terms_content === undefined) s.terms_content = "";
  if (s.responsibility_content === undefined) s.responsibility_content = "";
  if (s.report_removal_content === undefined) s.report_removal_content = "";
  if (s.important_notice === undefined) s.important_notice = "";
  if (s.about_content === undefined) s.about_content = "";
  if (s.disclaimer_heading === undefined) s.disclaimer_heading = "";
  if (s.ethics_heading === undefined) s.ethics_heading = "";
  if (s.portal_heading === undefined) s.portal_heading = "";
  if (s.important_notice_heading === undefined) s.important_notice_heading = "";
  return s;
}
