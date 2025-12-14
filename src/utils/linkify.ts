export const linkify = (text: string): { content: string; isHTML: boolean } => {
  // Improved regex that handles parentheses in URLs correctly
  const urlRegex = /(https?:\/\/[^\s()]+(?:\([^\s()]*\)[^\s()]*)*)/g;
  
  if (!urlRegex.test(text)) {
    return { content: text, isHTML: false };
  }
  
  const htmlContent = text.replace(
    urlRegex,
    (url) => {
      // Remove trailing punctuation that shouldn't be part of the URL
      const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">${cleanUrl}</a>`;
    }
  );
  
  return { content: htmlContent, isHTML: true };
};
