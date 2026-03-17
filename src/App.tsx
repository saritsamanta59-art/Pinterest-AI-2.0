import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from './contexts/AuthContext';
import { 
  Download, 
  Sparkles, 
  Palette, 
  Layout, 
  Image as ImageIcon, 
  Globe, 
  Copy,
  Check,
  ChevronRight,
  Loader2,
  AlertCircle,
  Layers,
  Droplet,
  Video,
  MousePointerClick,
  Calendar,
  Clock,
  LogOut,
  Share2,
  User,
  Plus,
  X,
  Mail,
  Lock,
  Settings
} from 'lucide-react';

// --- Font Options ---
const FONTS = [
  { name: 'Bold Sans', value: '"Arial Black", "Helvetica Neue", sans-serif' }, 
  { name: 'Sans Serif', value: 'Arial, Helvetica, sans-serif' },
  { name: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { name: 'Monospace', value: '"Courier New", Courier, monospace' },
  { name: 'Cursive', value: '"Brush Script MT", cursive' },
  { name: 'Modern', value: 'Verdana, Geneva, sans-serif' },
];

const COLOR_SCHEMES = [
  { id: 'standard', name: 'Standard', icon: Palette },
  { id: 'monochrome', name: 'Monochrome', icon: Droplet },
  { id: 'dark-overlay', name: 'Dark Overlay', icon: Layers },
];

export default function App() {
  const { profile, logout, updateProfileData } = useAuth();
  const navigate = useNavigate();

  // --- State ---
  const [keyword, setKeyword] = useState('');
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [loadingImages, setLoadingImages] = useState({}); 
  
  // Data for the 5 variations
  const [variations, setVariations] = useState([]); 
  const [currentVarIndex, setCurrentVarIndex] = useState(0);

  const [bgImageObj, setBgImageObj] = useState(null); 
  
  // Customization State 
  const [headline, setHeadline] = useState('Your Catchy Headline Here');
  const [ctaText, setCtaText] = useState('Download your 50 Free Woodworking Plan'); 
  const [brandText, setBrandText] = useState('');
  
  const [fontFamily, setFontFamily] = useState(FONTS[0].value);
  const [textColor, setTextColor] = useState('#000000'); 
  const [outlineColor, setOutlineColor] = useState('#ffffff'); 
  const [brandColor, setBrandColor] = useState('#ffffff');
  const [ctaBgColor, setCtaBgColor] = useState('#e60023'); 
  const [ctaTextColor, setCtaTextColor] = useState('#ffffff');
  
  const [textYPos, setTextYPos] = useState(45); 
  
  // New Style Options
  const [colorScheme, setColorScheme] = useState('standard');
  
  // UI State
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  const canvasRef = useRef(null);
  const authWindowRef = useRef(null);
  
  const getApiKey = () => {
    if (profile?.geminiApiKey) return profile.geminiApiKey;
    return process.env.GEMINI_API_KEY;
  };
  
  // --- Pinterest Credentials ---
  // Credentials are now handled securely on the server-side via environment variables.

  // --- Multiple Accounts & Scheduling State ---
  const [accounts, setAccounts] = useState([]); // Array of connected accounts
  const [activeAccountId, setActiveAccountId] = useState(''); // Currently selected account
  const [manualToken, setManualToken] = useState('');
  const [showManualToken, setShowManualToken] = useState(false);
  const [baseDestinationUrl, setBaseDestinationUrl] = useState('');
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const [isScheduling, setIsScheduling] = useState(false); 
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [boards, setBoards] = useState([]); 
  const [selectedBoard, setSelectedBoard] = useState('');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  const [scheduleDate, setScheduleDate] = useState(formatDateTimeLocal(tomorrow));
  const [publishImmediately, setPublishImmediately] = useState(true);

  // Sync accounts with profile
  useEffect(() => {
    if (profile?.pinterestAccounts) {
      setAccounts(profile.pinterestAccounts);
      if (profile.pinterestAccounts.length > 0 && !activeAccountId) {
        setActiveAccountId(profile.pinterestAccounts[0].id);
      }
    }
  }, [profile?.pinterestAccounts]);

  const saveAccountsToProfile = async (newAccounts) => {
    try {
      await updateProfileData({ pinterestAccounts: newAccounts });
    } catch (e) {
      console.error("Failed to save accounts to profile", e);
    }
  };

  // --- AI Logic ---

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setIsGeneratingText(true);
    setErrorMsg('');
    setVariations([]); 
    setLoadingImages({});

    const apiKey = getApiKey();
    if (!apiKey) {
      setErrorMsg('Please configure your Gemini API Key in Settings.');
      setIsGeneratingText(false);
      return;
    }

    try {
      const textPrompt = `
        Act as a Pinterest Marketing Expert. 
        Context: User wants pins for the keyword "${keyword}".
        
        Task: 
        1. Generate 5 DISTINCT variations. 
        2. For EACH variation, provide:
           - A unique, specific image generation prompt describing a background relevant to that specific angle (style: vertical, high quality, photorealistic).
           - A viral headline (max 10 words).
           - A unique Pinterest SEO Title.
           - A unique Description (approx 30 words).
           - 10 hashtags.
           - Suggested hex colors for "textColor" and "outlineColor".
        3. Suggest 2 hex colors for a fallback gradient.

        Return JSON format:
        {
          "variations": [
            {
              "headline": "string",
              "seoTitle": "string",
              "seoDescription": "string",
              "hashtags": "string",
              "textColor": "#hex",
              "outlineColor": "#hex",
              "imagePrompt": "string" 
            }
          ],
          "gradientColors": ["#hex1", "#hex2"]
        }
      `;

      const ai = new GoogleGenAI({ apiKey });
      const textResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: textPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      let rawAiText = textResponse.text || "{}";
      rawAiText = rawAiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiContent = JSON.parse(rawAiText);
      
      if (aiContent.variations && aiContent.variations.length > 0) {
        const newVariations = aiContent.variations.map(v => ({...v, imageUrl: null, fallbackMode: false}));
        setVariations(newVariations);
        applyVariationData(newVariations[0]);
        setCurrentVarIndex(0);
      }

    } catch (error) {
      console.error("Critical Failure:", error);
      setErrorMsg(`Generation failed: ${error.message}`);
    } finally {
      setIsGeneratingText(false);
    }
  };

  useEffect(() => {
    const currentVar = variations[currentVarIndex];
    if (currentVar && !currentVar.imageUrl && !currentVar.fallbackMode && !loadingImages[currentVarIndex]) {
      generateImageForVariation(currentVarIndex, currentVar.imagePrompt);
    }
    
    if (currentVar?.imageUrl) {
        const img = new Image();
        img.src = currentVar.imageUrl;
        img.crossOrigin = "anonymous";
        img.onload = () => setBgImageObj(img);
    } else {
        setBgImageObj(null);
    }
  }, [currentVarIndex, variations]); 

  const generateImageForVariation = async (index, prompt) => {
    setLoadingImages(prev => ({ ...prev, [index]: true }));

    const apiKey = getApiKey();
    if (!apiKey) {
      setLoadingImages(prev => ({ ...prev, [index]: false }));
      return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const finalPrompt = prompt || `Vertical photo of ${keyword}, aesthetic, high quality`;
        const imageResponse = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: finalPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '3:4',
          },
        });

        if (imageResponse.generatedImages?.[0]) {
          const base64Image = `data:image/png;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
          setVariations(prev => {
            const newVars = [...prev];
            newVars[index] = { ...newVars[index], imageUrl: base64Image };
            return newVars;
          });
        } else {
          throw new Error("No image data");
        }
    } catch (e) {
        console.warn(`Image gen failed for index ${index}`, e);
        setVariations(prev => {
            const newVars = [...prev];
            newVars[index] = { ...newVars[index], fallbackMode: true };
            return newVars;
        });
    } finally {
        setLoadingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const applyVariationData = (variation) => {
    setHeadline(variation.headline);
  };

  const handleVariationClick = (index) => {
    setCurrentVarIndex(index);
    applyVariationData(variations[index]);
  };

  // --- Multiple Accounts & Integrations Logic ---

  useEffect(() => {
    if (activeAccountId) {
      fetchBoardsForAccount(activeAccountId);
    } else {
      setBoards([]);
      setSelectedBoard('');
    }
  }, [activeAccountId]);

  const fetchBoardsForAccount = async (accountId: string, providedToken?: string) => {
    const account = accounts.find(a => a.id === accountId);
    const tokenToUse = providedToken || (account ? account.token : null);
    
    if (!tokenToUse) return;

    try {
      const response = await fetch('/api/pinterest/boards', {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to fetch boards');
      }
      
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setBoards(data.items);
        setSelectedBoard(data.items[0].id);
      } else {
        setBoards([]);
        setSelectedBoard('');
        setErrorMsg('No boards found on this Pinterest account. Please create a board first.');
      }
    } catch (e: any) {
      console.error("Could not fetch real boards:", e);
      setBoards([]);
      setSelectedBoard('');
      setErrorMsg(`Failed to fetch boards: ${e.message}`);
    }
  };

  const handleManualTokenSubmit = async () => {
    if (!manualToken.trim()) return;
    const maxAccounts = profile?.plan === 'pro' ? 10 : 1;
    if (accounts.length >= maxAccounts) {
      setErrorMsg(`Your current plan allows up to ${maxAccounts} Pinterest account${maxAccounts > 1 ? 's' : ''}. Please upgrade to add more.`);
      return;
    }
    setIsAuthenticating(true);
    try {
      const userRes = await fetch('/api/pinterest/user_account', {
        headers: { 'Authorization': `Bearer ${manualToken}` }
      });
      let accountName = `Pinterest User ${accounts.length + 1}`;
      let accountId = `user_${Date.now()}`;
      
      if (userRes.ok) {
        const userData = await userRes.json();
        accountName = userData.username || accountName;
        accountId = userData.id || accountId;
      }

      const newAccount = {
        id: accountId,
        name: accountName,
        token: manualToken,
      };

      setAccounts(prev => {
        const existing = prev.find(a => a.id === accountId);
        let newAccounts;
        if (existing) {
          newAccounts = prev.map(a => a.id === accountId ? { ...a, token: manualToken, name: accountName } : a);
        } else {
          newAccounts = [...prev, newAccount].slice(0, maxAccounts); // Max accounts based on plan
        }
        saveAccountsToProfile(newAccounts);
        return newAccounts;
      });
      setActiveAccountId(accountId);
      fetchBoardsForAccount(accountId, manualToken);
      setManualToken('');
      setShowManualToken(false);
    } catch (e) {
      console.error("Failed to fetch user profile", e);
      setErrorMsg("Failed to connect with manual token.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinterestConnectClick = async () => {
    const maxAccounts = profile?.plan === 'pro' ? 10 : 1;
    if (accounts.length >= maxAccounts) {
      setErrorMsg(`Your current plan allows up to ${maxAccounts} Pinterest account${maxAccounts > 1 ? 's' : ''}. Please upgrade to add more.`);
      return;
    }
    try {
      setIsAuthenticating(true);
      const response = await fetch('/api/auth/pinterest/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        url,
        'PinterestAuth',
        `width=${width},height=${height},top=${top},left=${left}`
      );
      authWindowRef.current = authWindow;

      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
        setIsAuthenticating(false);
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setErrorMsg('Failed to initiate Pinterest connection.');
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    const handleMessage = async (event) => {
      // Validate origin is from AI Studio preview, localhost, or the current origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'PINTEREST_AUTH_SUCCESS') {
        if (authWindowRef.current) {
          authWindowRef.current.close();
          authWindowRef.current = null;
        }
        
        const maxAccounts = profile?.plan === 'pro' ? 10 : 1;
        if (accounts.length >= maxAccounts) {
          setErrorMsg(`Your current plan allows up to ${maxAccounts} Pinterest account${maxAccounts > 1 ? 's' : ''}. Please upgrade to add more.`);
          setIsAuthenticating(false);
          return;
        }

        const token = event.data.token;
        
        // Fetch user profile to get the name
        try {
          const userRes = await fetch('/api/pinterest/user_account', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          let accountName = `Pinterest User ${accounts.length + 1}`;
          let accountId = `user_${Date.now()}`;
          
          if (userRes.ok) {
            const userData = await userRes.json();
            accountName = userData.username || accountName;
            accountId = userData.id || accountId;
          }

          const newAccount = {
            id: accountId,
            name: accountName,
            token: token,
          };

          setAccounts(prev => {
            const existing = prev.find(a => a.id === accountId);
            let newAccounts;
            if (existing) {
              newAccounts = prev.map(a => a.id === accountId ? { ...a, token: token, name: accountName } : a);
            } else {
              const maxAccs = profile?.plan === 'pro' ? 10 : 1;
              newAccounts = [...prev, newAccount].slice(0, maxAccs); // Max accounts based on plan
            }
            saveAccountsToProfile(newAccounts);
            return newAccounts;
          });
          setActiveAccountId(accountId);
          fetchBoardsForAccount(accountId, token);
        } catch (e) {
          console.error("Failed to fetch user profile", e);
        } finally {
          setIsAuthenticating(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [accounts.length, profile?.plan]);

  const handleRemoveAccount = (accountId) => {
    const updatedAccounts = accounts.filter(a => a.id !== accountId);
    setAccounts(updatedAccounts);
    saveAccountsToProfile(updatedAccounts);
    if (activeAccountId === accountId) {
      setActiveAccountId(updatedAccounts.length > 0 ? updatedAccounts[0].id : '');
    }
  };

  const handleSchedulePin = async () => {
    const activeAccount = accounts.find(a => a.id === activeAccountId);
    if (!activeAccount || !canvasRef.current || !selectedBoard) return;
    
    setIsScheduling(true);
    setScheduleSuccess(false);
    setErrorMsg('');

    const imageData = canvasRef.current.toDataURL('image/png');
    const currentVar = variations[currentVarIndex] || {};

    const scheduleDateObj = new Date(scheduleDate);
    
    let finalLink = brandText ? `https://${brandText}` : '';
    if (baseDestinationUrl) {
      const slug = currentVar.seoTitle ? currentVar.seoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
      const separator = baseDestinationUrl.includes('?') ? '&' : '?';
      finalLink = slug ? `${baseDestinationUrl}${separator}${slug}` : baseDestinationUrl;
    }

    const payload: any = {
      board_id: selectedBoard,
      description: currentVar.seoDescription, 
      link: finalLink,
      title: currentVar.seoTitle,
      media_source: {
        source_type: 'image_base64',
        content_type: 'image/png',
        data: imageData.split(',')[1]
      }
    };

    if (!publishImmediately) {
      payload.publish_at = scheduleDateObj.toISOString();
    }

    console.log(`Submitting to Pinterest API on behalf of ${activeAccount.name}...`);
    
    try {
      const response = await fetch('/api/pinterest/pins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeAccount.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errorMsg = errData.message || errData.error || errData.code || JSON.stringify(errData);
        throw new Error(errorMsg === '{}' ? `API Status: ${response.status}` : errorMsg);
      }

      const result = await response.json();
      
      if (publishImmediately) {
        setSuccessMessage(`Pin published successfully on ${activeAccount.name}!`);
      } else {
        const readableDate = scheduleDateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
        setSuccessMessage(`Pin scheduled on ${activeAccount.name} for ${readableDate}!`);
      }
      setScheduleSuccess(true);
      setTimeout(() => setScheduleSuccess(false), 5000);

    } catch (e: any) {
      let errorMessage = e.message;
      if (errorMessage.includes('403') || errorMessage.includes('Not authorized')) {
        errorMessage += " - Please ensure you are using a Pinterest Business account, you have granted all requested permissions, and you are an authorized tester for this app.";
      }
      setErrorMsg(`Failed to publish pin: ${errorMessage}`);
    } finally {
      setIsScheduling(false);
    }
  };

  // --- Canvas Rendering Engine ---

  const getLines = (ctx, text, maxWidth) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) currentLine += " " + word;
      else { lines.push(currentLine); currentLine = word; }
    }
    lines.push(currentLine);
    return lines;
  };

  const calculateOptimalFontSize = (ctx, text, maxWidth, maxHeight, fontFace) => {
    let minSize = 40;
    let maxSize = 400; 
    let optimal = minSize;

    while (minSize <= maxSize) {
      const mid = Math.floor((minSize + maxSize) / 2);
      ctx.font = `bold ${mid}px ${fontFace}`;
      
      const words = text.split(" ");
      let valid = true;
      
      for (let word of words) {
        if (ctx.measureText(word).width > maxWidth) {
          valid = false;
          break;
        }
      }

      if (valid) {
        const lines = getLines(ctx, text, maxWidth);
        const totalHeight = lines.length * mid * 1.2;
        if (totalHeight > maxHeight) {
          valid = false;
        }
      }

      if (valid) {
        optimal = mid;
        minSize = mid + 1; 
      } else {
        maxSize = mid - 1; 
      }
    }
    return optimal;
  };

  const drawRoundedRect = (ctx, x, y, w, h, r) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const renderPin = (ctx, width, height, scaleFactor = 1.0) => {
    const currentVar = variations[currentVarIndex];
    const isFallback = currentVar?.fallbackMode;

    ctx.clearRect(0, 0, width, height);

    if (bgImageObj && !isFallback) {
      const baseScale = Math.max(width / bgImageObj.width, height / bgImageObj.height);
      const effectiveScale = baseScale * scaleFactor;
      
      const w = bgImageObj.width * effectiveScale;
      const h = bgImageObj.height * effectiveScale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      
      ctx.drawImage(bgImageObj, x, y, w, h);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#f87171');
      gradient.addColorStop(1, '#c026d3');
      
      ctx.save();
      ctx.translate(width/2, height/2);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.translate(-width/2, -height/2);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      for(let i=0; i<width; i+=20) ctx.fillRect(i, 0, 1, height);
      
      ctx.restore();
    }

    let overlayAlpha = 0.2;
    let effectiveTextColor = textColor;
    let effectiveOutlineColor = outlineColor;

    if (colorScheme === 'dark-overlay') {
      overlayAlpha = 0.6;
      effectiveTextColor = '#ffffff'; 
    } else if (colorScheme === 'monochrome') {
       ctx.globalCompositeOperation = 'saturation';
       ctx.fillStyle = 'black';
       ctx.fillRect(0,0,width,height);
       ctx.globalCompositeOperation = 'source-over'; 
       effectiveTextColor = '#ffffff';
       effectiveOutlineColor = '#000000';
    }

    ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
    ctx.fillRect(0, 0, width, height);

    if (headline) {
      const maxWidth = width * 0.9;
      const maxHeight = height * 0.55; 
      
      const optimalFontSize = calculateOptimalFontSize(ctx, headline, maxWidth, maxHeight, fontFamily);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${optimalFontSize}px ${fontFamily}`;
      
      const lineHeight = optimalFontSize * 1.2;
      const x = width / 2;
      const y = (height * (textYPos / 100));

      const lines = getLines(ctx, headline, maxWidth);
      let currentY = y - ((lines.length * lineHeight) / 2) + (lineHeight / 2);

      lines.forEach(line => {
        ctx.strokeStyle = effectiveOutlineColor;
        ctx.lineWidth = optimalFontSize * 0.25; 
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(line, x, currentY);

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;

        ctx.fillStyle = effectiveTextColor;
        ctx.fillText(line, x, currentY);

        ctx.shadowColor = 'transparent';
        currentY += lineHeight;
      });
    }

    if (ctaText) {
      const ctaY = height * 0.92; 
      const btnWidth = width * 0.9;
      const btnHeight = 120; 
      
      let ctaFontSize = 45;
      ctx.font = `bold ${ctaFontSize}px ${fontFamily}`;
      const textWidth = ctx.measureText(ctaText).width;
      
      const maxTextWidth = btnWidth * 0.9;
      if (textWidth > maxTextWidth) {
         ctaFontSize = ctaFontSize * (maxTextWidth / textWidth);
         ctx.font = `bold ${ctaFontSize}px ${fontFamily}`;
      }
      
      const btnX = (width - btnWidth) / 2;
      const btnY = ctaY - (btnHeight / 2);

      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 8;
      
      ctx.fillStyle = ctaBgColor;
      drawRoundedRect(ctx, btnX, btnY, btnWidth, btnHeight, btnHeight/2);
      ctx.fill();
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = ctaTextColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ctaText, width / 2, ctaY + 4); 
    }

    if (brandText) {
      ctx.textAlign = 'center';
      ctx.font = `bold 24px ${fontFamily}`;
      ctx.fillStyle = brandColor;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      const brandY = ctaText ? (height * 0.92 - 80) : (height - 40);
      ctx.fillText(brandText, width / 2, brandY);
    }
  };

  useEffect(() => {
    if (isRecording) return; 
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1000;
    canvas.height = 1500;

    renderPin(ctx, 1000, 1500, 1.0); 
  }, [bgImageObj, variations, currentVarIndex, headline, ctaText, brandText, fontFamily, textColor, outlineColor, brandColor, ctaBgColor, ctaTextColor, textYPos, colorScheme, isRecording]);


  // --- Video Recording Logic ---
  
  const handleVideoDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRecording(true);
    setRecordingProgress(0);

    const stream = canvas.captureStream(30); 
    const chunks = [];
    
    const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = mimeType === 'video/mp4' ? 'mp4' : 'webm';
      link.download = `pin-video-${keyword.replace(/s+/g, '-')}.${ext}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
      setRecordingProgress(0);
    };

    recorder.start();

    const ctx = canvas.getContext('2d');
    const width = 1000;
    const height = 1500;
    
    const duration = 8000; 
    const startTime = performance.now();
    const startScale = 1.15; 
    const endScale = 1.0;    

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setRecordingProgress(Math.round(progress * 100));

      const currentScale = startScale - ((startScale - endScale) * progress);

      renderPin(ctx, width, height, currentScale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        recorder.stop();
      }
    };

    requestAnimationFrame(animate);
  };

  // --- Handlers ---
  const handleImageDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `pin-${keyword.replace(/s+/g, '-')}-v${currentVarIndex + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const copyToClipboard = (text) => {
    const copyFallback = (val) => {
      const textArea = document.createElement("textarea");
      textArea.value = val;
      textArea.style.position = "fixed"; 
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          setErrorMsg('Failed to copy text.');
        }
      } catch (err) {
        console.error('Fallback copy failed', err);
        setErrorMsg('Failed to copy text.');
      }
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          copyFallback(text);
        });
    } else {
      copyFallback(text);
    }
  };

  const currentVariation = variations[currentVarIndex] || {};
  const isImageLoading = loadingImages[currentVarIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-red-100 selection:text-red-600">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-full">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">PinGenius AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/profile')}
              className="text-slate-500 hover:text-slate-900 transition-colors"
              title="Profile"
            >
              <User className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="text-slate-500 hover:text-slate-900 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => logout()}
              className="text-slate-500 hover:text-red-600 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Controls */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 order-2 lg:order-1 h-full">
          
          {/* 1. Pinterest Connection Manager */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-[#E60023] p-1.5 rounded-full">
                  <Share2 className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pinterest Accounts</h3>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${accounts.length > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`}></div>
            </div>

            {accounts.length === 0 ? (
              <div className="space-y-3">
                <button 
                  onClick={handlePinterestConnectClick}
                  disabled={isAuthenticating}
                  className="w-full bg-[#E60023] hover:bg-[#ad081b] text-white px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isAuthenticating ? 'Authorizing in Popup...' : 'Connect Pinterest Account'}
                </button>
                
                {!showManualToken ? (
                  <button 
                    onClick={() => setShowManualToken(true)}
                    className="w-full text-xs text-slate-500 hover:text-slate-700 underline text-center"
                  >
                    Or connect with access token manually
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Paste access token here..." 
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="flex-1 p-2 rounded-lg border border-slate-200 text-sm focus:border-red-500 outline-none"
                    />
                    <button 
                      onClick={handleManualTokenSubmit}
                      disabled={isAuthenticating || !manualToken.trim()}
                      className="bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <select
                    value={activeAccountId}
                    onChange={(e) => setActiveAccountId(e.target.value)}
                    className="w-full p-3 pl-10 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:border-[#E60023] focus:outline-none appearance-none cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 rotate-90" />
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={handlePinterestConnectClick}
                    disabled={isAuthenticating}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-70"
                  >
                    {isAuthenticating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    {isAuthenticating ? 'Authorizing...' : 'Add Account'}
                  </button>
                  <button 
                    onClick={() => handleRemoveAccount(activeAccountId)}
                    className="flex-1 bg-white hover:bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg font-semibold text-xs transition-colors"
                  >
                    Disconnect Active
                  </button>
                </div>
                {profile?.plan !== 'pro' && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-xs text-amber-800 font-medium mb-2">Free plan limited to 1 account.</p>
                    <button 
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/create-paypal-order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: profile?.uid, plan: 'pro' })
                          });
                          if (!response.ok) {
                            const text = await response.text();
                            throw new Error(`Failed to create PayPal order: ${response.status} ${text}`);
                          }
                          const data = await response.json();
                          if (data.url) window.location.href = data.url;
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors"
                    >
                      Upgrade to Pro ($1)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Generation Input */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              What is your Pin about?
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Small Apartment Decor"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <button 
                onClick={handleGenerate}
                disabled={isGeneratingText || !keyword || isRecording}
                className={`px-6 py-3 rounded-xl font-semibold text-white transition-all flex items-center gap-2 ${
                  isGeneratingText || !keyword || isRecording ? 'bg-slate-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-md'
                }`}
              >
                {isGeneratingText ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Create
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Destination Base URL (Optional)
              </label>
              <input 
                type="url" 
                value={baseDestinationUrl}
                onChange={(e) => setBaseDestinationUrl(e.target.value)}
                placeholder="e.g. https://subscribepage.io/woodworkingteds"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                A unique slug based on the pin title will be appended automatically (e.g. ?your-pin-title)
              </p>
            </div>

            {errorMsg && (
              <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* 3. Customization Controls (Shown after generation) */}
          {variations.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
              {/* Variation Selector */}
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Layers className="w-3 h-3" /> Select Variation
                </label>
                <div className="flex gap-2">
                  {variations.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleVariationClick(idx)}
                      disabled={isRecording}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${
                        currentVarIndex === idx 
                        ? 'bg-red-600 border-red-600 text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500'
                      }`}
                    >
                      {loadingImages[idx] ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Combined Container */}
              <div className={`p-6 space-y-8 ${isRecording ? 'opacity-50 pointer-events-none' : ''}`}>
                
                {/* --- DESIGN SECTION --- */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Palette className="w-4 h-4 text-red-600" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Design Styling</h3>
                    </div>

                    {/* Style Presets */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Color Scheme</label>
                      <div className="grid grid-cols-3 gap-2">
                        {COLOR_SCHEMES.map((scheme) => {
                          const Icon = scheme.icon;
                          return (
                            <button
                              key={scheme.id}
                              onClick={() => setColorScheme(scheme.id)}
                              className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                                colorScheme === scheme.id
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <Icon className="w-4 h-4 mb-1" />
                              {scheme.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Headline */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Headline</label>
                      <textarea 
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        className="w-full p-3 rounded-lg border border-slate-200 text-slate-700 text-sm focus:border-red-500 outline-none resize-none h-20"
                      />
                    </div>
                    
                    {/* Call To Action */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <MousePointerClick className="w-3 h-3" /> Call to Action (CTA)
                      </label>
                      <textarea 
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="w-full p-3 rounded-lg border border-slate-200 text-slate-700 text-sm focus:border-red-500 outline-none resize-none h-16"
                        placeholder="e.g. Download Free PDF"
                      />
                      <div className="flex gap-2 items-center">
                          <label className="text-xs text-slate-400">Button Color</label>
                          <input type="color" value={ctaBgColor} onChange={(e) => setCtaBgColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-slate-200" />
                          
                          <label className="text-xs text-slate-400 ml-2">Text Color</label>
                          <input type="color" value={ctaTextColor} onChange={(e) => setCtaTextColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-slate-200" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Font</label>
                        <div className="relative">
                            <select 
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            className="w-full appearance-none p-2 pl-3 pr-8 rounded-lg border border-slate-200 text-sm bg-white focus:border-red-500 focus:outline-none"
                            >
                            {FONTS.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
                            </select>
                            <ChevronRight className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 rotate-90" />
                        </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Text Color</label>
                          <div className="h-10 w-full rounded-lg border border-slate-200 overflow-hidden relative cursor-pointer group">
                             <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} disabled={colorScheme !== 'standard'} className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer disabled:opacity-50" />
                             <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/10 group-hover:bg-transparent">
                                <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: textColor }}></div>
                             </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Outline</label>
                          <div className="h-10 w-full rounded-lg border border-slate-200 overflow-hidden relative cursor-pointer group">
                             <input type="color" value={outlineColor} onChange={(e) => setOutlineColor(e.target.value)} disabled={colorScheme === 'monochrome'} className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer disabled:opacity-50" />
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/10 group-hover:bg-transparent">
                                <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: outlineColor }}></div>
                             </div>
                          </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Vertical Position</label>
                        <input 
                            type="range" min="10" max="90" value={textYPos} 
                            onChange={(e) => setTextYPos(Number(e.target.value))}
                            className="w-full accent-red-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* --- SEO SECTION --- */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Layout className="w-4 h-4 text-red-600" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">SEO & Metadata</h3>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">SEO Title</label>
                        <button onClick={() => copyToClipboard(currentVariation.seoTitle)} className="text-slate-400 hover:text-red-600 transition-colors">
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-sm text-slate-800 font-medium">{currentVariation?.seoTitle || ''}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">Description & Hashtags</label>
                         <button onClick={() => copyToClipboard(`${currentVariation.seoDescription}\n\n${currentVariation.hashtags}`)} className="text-slate-400 hover:text-red-600 transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {currentVariation?.seoDescription || ''}
                        <br /><br />
                        <span className="text-blue-600 font-medium">{currentVariation?.hashtags || ''}</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Destination URL</label>
                        <button onClick={() => {
                          const slug = currentVariation?.seoTitle ? currentVariation.seoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
                          const separator = baseDestinationUrl.includes('?') ? '&' : '?';
                          const finalLink = baseDestinationUrl ? (slug ? `${baseDestinationUrl}${separator}${slug}` : baseDestinationUrl) : (brandText ? `https://${brandText}` : '');
                          copyToClipboard(finalLink);
                        }} className="text-slate-400 hover:text-red-600 transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-blue-600 font-medium break-all">
                        {(() => {
                          const slug = currentVariation?.seoTitle ? currentVariation.seoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
                          const separator = baseDestinationUrl.includes('?') ? '&' : '?';
                          return baseDestinationUrl ? (slug ? `${baseDestinationUrl}${separator}${slug}` : baseDestinationUrl) : (brandText ? `https://${brandText}` : 'No URL set');
                        })()}
                      </p>
                    </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Right Column: Canvas Preview & Scheduler */}
        <div className="w-full lg:w-2/3 order-1 lg:order-2 flex flex-col items-center">
          <div className="sticky top-24 w-full flex flex-col items-center">
            
            {/* Action Bar */}
            {variations.length > 0 && (
              <div className="w-full max-w-[500px] flex justify-between items-center mb-4 gap-2">
                <span className="text-sm font-semibold text-slate-500 flex items-center gap-2 mr-auto">
                  Live Preview <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">Var {currentVarIndex + 1}</span>
                </span>
                
                {/* Download Video Button */}
                <button 
                  onClick={handleVideoDownload}
                  disabled={isRecording || !bgImageObj}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm border ${
                     isRecording 
                     ? 'bg-red-50 text-red-600 border-red-200' 
                     : 'bg-white text-slate-700 border-slate-200 hover:border-red-300 hover:text-red-600'
                  }`}
                >
                  {isRecording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  {isRecording ? `${recordingProgress}%` : 'Video'}
                </button>

                {/* Download Image Button */}
                <button 
                  onClick={handleImageDownload}
                  disabled={isRecording}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4" /> PNG
                </button>
              </div>
            )}

            {/* Canvas Container */}
            <div className="relative shadow-2xl rounded-2xl overflow-hidden bg-white ring-1 ring-slate-900/5 aspect-[2/3] w-full max-w-[500px]">
              {/* Overlay Loader */}
              {(isGeneratingText || isImageLoading) && (
                <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
                  <p className="font-medium animate-pulse">
                    {isGeneratingText ? 'Writing viral text...' : 'Generating unique background...'}
                  </p>
                </div>
              )}

              {/* Recording Indicator Overlay */}
              {isRecording && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                   <div className="w-2 h-2 bg-white rounded-full"></div>
                   REC
                </div>
              )}
              
              {!variations.length && !isGeneratingText && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Enter a keyword to start</p>
                 </div>
              )}

              <canvas ref={canvasRef} className="w-full h-full object-contain block" />
            </div>

            {/* --- Pinterest Scheduler UI (Only show if accounts connected & content generated) --- */}
            {variations.length > 0 && !isGeneratingText && accounts.length > 0 && (
              <div className="mt-8 w-full max-w-[500px] bg-white rounded-2xl shadow-lg border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-6">
                  <div className="bg-[#E60023] p-1.5 rounded-full">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Schedule Pin</h3>
                </div>

                <div className="space-y-4">
                  {scheduleSuccess && (
                    <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                      <Check className="w-4 h-4" />
                      {successMessage || "Pin scheduled successfully!"}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                      Target Account
                    </label>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#E60023]" />
                      {accounts.find(a => a.id === activeAccountId)?.name || 'Unknown Account'}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Board</label>
                    <select 
                      value={selectedBoard}
                      onChange={(e) => setSelectedBoard(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:border-red-500 focus:outline-none"
                    >
                      {boards.map(board => (
                        <option key={board.id} value={board.id}>{board.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-3 mb-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                        <input 
                          type="radio" 
                          checked={publishImmediately} 
                          onChange={() => setPublishImmediately(true)}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        Publish Immediately
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                        <input 
                          type="radio" 
                          checked={!publishImmediately} 
                          onChange={() => setPublishImmediately(false)}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        Schedule for Later
                      </label>
                    </div>

                    {!publishImmediately && (
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Publish Date</label>
                          <div className="relative">
                            <input 
                              type="datetime-local" 
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:border-red-500 focus:outline-none"
                            />
                          </div>
                      </div>
                    )}
                    <div className="flex items-end mt-2">
                        <button 
                          onClick={handleSchedulePin}
                          disabled={isScheduling || scheduleSuccess || !selectedBoard}
                          className={`w-full p-3 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                            scheduleSuccess 
                              ? 'bg-green-600 hover:bg-green-700' 
                              : 'bg-slate-900 hover:bg-slate-800'
                          }`}
                        >
                          {isScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                          {scheduleSuccess ? (publishImmediately ? 'Published' : 'Scheduled') : (publishImmediately ? 'Publish Pin Now' : 'Schedule Pin')}
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
      
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 text-center border-t border-slate-200 mt-12">
        <Link to="/privacypolicy" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
