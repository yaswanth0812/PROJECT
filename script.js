document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const resumeInput = document.getElementById('resume-input');
    const fileUpload = document.getElementById('file-upload');
    const fileIndicator = document.getElementById('file-indicator');
    const fileNameDisplay = document.getElementById('file-name-display');
    const clearFileBtn = document.getElementById('clear-file-btn');
    
    const btnFull = document.getElementById('btn-full-analysis');
    const btnGrammar = document.getElementById('btn-grammar');
    const btnAts = document.getElementById('btn-ats');
    
    const resultsSection = document.getElementById('results-section');
    const appGrid = document.querySelector('.app-grid');

    // Results Elements
    const scoreValue = document.getElementById('score-value');
    const scoreProgress = document.getElementById('score-progress');
    const scoreLabel = document.getElementById('score-label');
    const foundSkillsContainer = document.getElementById('found-skills');
    const missingSkillsContainer = document.getElementById('missing-skills');
    const suggestionsList = document.getElementById('suggestions-list');
    
    const rewrittenResumeGroup = document.getElementById('rewritten-resume-group');
    const rewrittenResumeBox = document.getElementById('rewritten-resume-box');
    const downloadBtn = document.getElementById('download-btn');

    // State
    let uploadedText = '';
    let currentRewrittenResume = '';

    // Configure PDF.js worker
    if (window['pdfjs-dist/build/pdf']) {
        window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    // Event Listeners
    fileUpload.addEventListener('change', handleFileUpload);
    clearFileBtn.addEventListener('click', clearFile);
    
    btnFull.addEventListener('click', () => startAnalysis('full'));
    btnGrammar.addEventListener('click', () => startAnalysis('grammar'));
    btnAts.addEventListener('click', () => startAnalysis('ats'));

    downloadBtn.addEventListener('click', downloadOptimizedResume);

    // Clear uploaded text if user starts typing manually
    resumeInput.addEventListener('input', () => {
        if (uploadedText) {
            clearFile();
        }
    });

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        fileNameDisplay.textContent = file.name;
        
        // Show indicator, hide textarea
        resumeInput.style.display = 'none';
        fileIndicator.classList.remove('hidden');

        if (fileName.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = function (event) {
                uploadedText = event.target.result;
            };
            reader.readAsText(file);
        } else if (fileName.endsWith('.pdf')) {
            const reader = new FileReader();
            reader.onload = function (event) {
                extractTextFromPDF(event.target.result);
            };
            reader.readAsArrayBuffer(file);
        } else if (fileName.endsWith('.docx')) {
            const reader = new FileReader();
            reader.onload = function (event) {
                extractTextFromDOCX(event.target.result);
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert("Please upload a .txt, .pdf, or .docx file.");
            clearFile();
        }
        e.target.value = '';
    }

    function extractTextFromPDF(arrayBuffer) {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        if (!pdfjsLib) {
            alert("Error: PDF.js library failed to load.");
            clearFile();
            return;
        }

        const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
        loadingTask.promise.then(pdf => {
            let maxPages = pdf.numPages;
            let countPromises = [];

            for (let j = 1; j <= maxPages; j++) {
                let page = pdf.getPage(j);
                countPromises.push(page.then(function (page) {
                    return page.getTextContent().then(function (text) {
                        return text.items.map(function (s) { return s.str; }).join(' ');
                    });
                }));
            }

            Promise.all(countPromises).then(function (texts) {
                uploadedText = texts.join('\n');
            }).catch(error => {
                console.error(error);
                alert("Error extracting text from PDF pages.");
            });
        }).catch(error => {
            console.error(error);
            alert("Error reading PDF file. It might be corrupted or encrypted.");
        });
    }

    function extractTextFromDOCX(arrayBuffer) {
        if (!window.mammoth) {
            alert("Error: Mammoth.js library failed to load.");
            clearFile();
            return;
        }

        mammoth.extractRawText({ arrayBuffer: arrayBuffer })
            .then(function (result) {
                uploadedText = result.value;
            })
            .catch(function (error) {
                console.error(error);
                alert("Error extracting text from DOCX file.");
            });
    }

    function clearFile() {
        uploadedText = '';
        resumeInput.value = '';
        resumeInput.style.display = 'block';
        fileIndicator.classList.add('hidden');
        hideResults();
    }

    function hideResults() {
        resultsSection.classList.add('hidden');
        resultsSection.style.display = 'none';
        appGrid.classList.remove('has-results');
        scoreProgress.style.strokeDashoffset = 314;
    }

    function setLoadingState(isLoading) {
        const btns = [btnFull, btnGrammar, btnAts];
        btns.forEach(btn => btn.disabled = isLoading);
        
        if (isLoading) {
            hideResults();
            appGrid.classList.add('has-results');
            resultsSection.style.display = 'flex';
            resultsSection.classList.remove('hidden');
            
            scoreValue.textContent = '-';
            scoreLabel.textContent = 'Analyzing...';
            scoreProgress.style.stroke = 'var(--text-secondary)';
            
            foundSkillsContainer.innerHTML = '<div class="loading-indicator">Processing...</div>';
            missingSkillsContainer.innerHTML = '';
            suggestionsList.innerHTML = '<li class="loading-indicator">Consulting Heuristic Engine...</li>';
            rewrittenResumeGroup.classList.add('hidden');
        }
    }

    // --- ADVANCED MOCK AI HEURISTIC ENGINE ---
    const DICTIONARY = {
        strongVerbs: ["architected", "engineered", "spearheaded", "orchestrated", "developed", "managed", "designed", "implemented", "led", "optimized", "reduced", "increased", "maximized", "streamlined", "transformed", "pioneered", "launched", "executed"],
        weakPhrases: ["responsible for", "helped with", "worked on", "assisted", "did", "made", "tasked with", "handled", "was involved in", "duties included"],
        techSkills: ["python", "java", "javascript", "react", "node.js", "node", "sql", "mysql", "postgresql", "aws", "docker", "agile", "kubernetes", "typescript", "c++", "c#", "azure", "gcp", "git", "html", "css", "linux", "mongodb", "spring boot", "django", "flask"],
        softSkills: ["communication", "leadership", "teamwork", "problem solving", "collaboration", "management", "adaptability", "creativity", "critical thinking"]
    };

    function analyzeWithHeuristics(text, actionType) {
        const lowerText = text.toLowerCase();
        const wordCount = lowerText.split(/\W+/).filter(w => w.length > 0).length;
        
        // Feature Extraction
        const foundVerbs = DICTIONARY.strongVerbs.filter(verb => lowerText.includes(verb));
        const foundWeak = DICTIONARY.weakPhrases.filter(phrase => lowerText.includes(phrase));
        const foundTech = DICTIONARY.techSkills.filter(skill => lowerText.includes(skill));
        const foundSoft = DICTIONARY.softSkills.filter(skill => lowerText.includes(skill));
        
        // Find quantifiable metrics (e.g., "15%", "$500k", "50+")
        const metricRegex = /\b\d+%|\$\d+[kmb]?|\b\d+\+\b/gi;
        const foundMetrics = text.match(metricRegex) || [];

        let score = 5; // Base score
        let suggestions = [];
        let foundSkillsDisplay = [];
        let missingSkillsDisplay = [];
        let rewrittenResume = "";

        // Combine skills for easier missing calculation
        const allSkillsFound = [...foundTech, ...foundSoft];
        const topMissingTech = DICTIONARY.techSkills.filter(skill => !lowerText.includes(skill)).slice(0, 4);

        if (actionType === 'full') {
            // SCORING
            score += Math.min(2, foundVerbs.length * 0.5); // Up to +2 for strong verbs
            score += Math.min(2, foundTech.length * 0.25); // Up to +2 for tech skills
            score += Math.min(2, foundMetrics.length * 0.5); // Up to +2 for metrics
            score -= foundWeak.length * 0.5; // -0.5 for each weak phrase
            
            if (wordCount < 200) { score -= 2; suggestions.push("Resume is too brief. Add more detail to your experience section."); }
            if (wordCount > 1000) { score -= 1; suggestions.push("Resume is very long. Consider cutting down to the most impactful points."); }

            // SUGGESTIONS
            if (foundMetrics.length === 0) suggestions.push("Add quantifiable metrics (e.g., increased sales by 15%, managed team of 5) to prove your impact.");
            if (foundWeak.length > 0) suggestions.push(`Replace weak phrases like "${foundWeak[0]}" with strong action verbs like "Spearheaded" or "Orchestrated".`);
            if (foundTech.length < 3) suggestions.push("Include more hard/technical skills relevant to your target industry.");
            
            if (suggestions.length === 0) suggestions.push("Great job! Your resume looks very strong overall.");

            foundSkillsDisplay = [...foundVerbs.slice(0,3), ...foundTech.slice(0,5)];
            missingSkillsDisplay = topMissingTech;

        } else if (actionType === 'grammar') {
            // SCORING
            score = 6;
            score += Math.min(3, foundVerbs.length);
            score -= foundWeak.length;

            if (foundWeak.length > 0) {
                suggestions.push(`Found passive language. Avoid phrases like "${foundWeak.join('", "')}".`);
            } else {
                suggestions.push("Excellent use of active voice and professional phrasing!");
            }

            if (foundVerbs.length < 3) {
                suggestions.push("Your bullet points need stronger starting verbs (e.g., Developed, Managed).");
            }

            foundSkillsDisplay = foundVerbs.length > 0 ? foundVerbs : ["Clear syntax"];
            missingSkillsDisplay = foundWeak.length > 0 ? foundWeak : ["None detected"];
            
        } else if (actionType === 'ats') {
            // SCORING
            score = 5;
            score += Math.min(3, foundTech.length * 0.5);
            score -= foundWeak.length * 0.5;

            // SUGGESTIONS
            suggestions.push("Injected critical missing industry keywords to bypass ATS filters.");
            if (foundWeak.length > 0) suggestions.push(`Automatically replaced weak phrasing like "${foundWeak[0]}" with strong verbs.`);
            suggestions.push("Reformatted sections for optimal ATS parser compatibility.");

            foundSkillsDisplay = foundTech.length > 0 ? foundTech : ["Standard Formatting"];
            missingSkillsDisplay = topMissingTech;

            // ATS REWRITE LOGIC
            let optimizedText = text;
            
            // Replace weak phrases with random strong verbs
            DICTIONARY.weakPhrases.forEach((weak, i) => {
                const replaceStr = DICTIONARY.strongVerbs[i % DICTIONARY.strongVerbs.length];
                // simple replace all case-insensitive
                const regex = new RegExp("\\b" + weak + "\\b", "gi");
                optimizedText = optimizedText.replace(regex, replaceStr.charAt(0).toUpperCase() + replaceStr.slice(1));
            });

            rewrittenResume = "========================================\n";
            rewrittenResume += "          ATS OPTIMIZED RESUME          \n";
            rewrittenResume += "========================================\n\n";
            rewrittenResume += optimizedText + "\n\n";
            rewrittenResume += "----------------------------------------\n";
            rewrittenResume += "SYSTEM ADDED ATS KEYWORDS (INVISIBLE TAGS):\n";
            rewrittenResume += topMissingTech.join(" | ") + " | " + DICTIONARY.softSkills.slice(0,3).join(" | ");
        }

        // Bound score between 1 and 10
        score = Math.max(1, Math.min(10, Math.round(score)));

        return {
            score: score,
            found_skills: foundSkillsDisplay,
            missing_skills: missingSkillsDisplay,
            suggestions: suggestions.slice(0, 5),
            rewritten_resume: rewrittenResume
        };
    }

    async function startAnalysis(actionType) {
        const textToAnalyze = uploadedText || resumeInput.value;
        const text = textToAnalyze.trim().substring(0, 5000); // Truncate

        if (text.length < 50) {
            alert("Please enter a longer resume text for meaningful analysis.");
            return;
        }

        setLoadingState(true);

        // Simulate network delay to make the heuristic engine feel "weighty" and intelligent
        setTimeout(() => {
            try {
                const parsedData = analyzeWithHeuristics(text, actionType);
                updateResultsUI(parsedData, actionType);
            } catch (error) {
                console.error("Heuristic Analysis failed:", error);
                alert("The local analysis engine encountered an error.");
                hideResults();
            } finally {
                const btns = [btnFull, btnGrammar, btnAts];
                btns.forEach(btn => btn.disabled = false);
            }
        }, 1200);
    }

    function updateResultsUI(data, actionType) {
        // Fallback checks
        const score = data.score || 5;
        const foundSkills = data.found_skills || [];
        const missingSkills = data.missing_skills || [];
        const suggestions = data.suggestions || ["Keep improving your resume!"];
        
        scoreValue.textContent = score;

        // Animate Circle
        const offset = 314 - (314 * (score / 10));
        let color = 'var(--danger)';
        let label = 'Needs Work';
        if (score >= 8) {
            color = 'var(--success)';
            label = 'Excellent!';
        } else if (score >= 5) {
            color = 'var(--warning)';
            label = 'Good, but can improve';
        }

        setTimeout(() => {
            scoreProgress.style.strokeDashoffset = offset;
            scoreProgress.style.stroke = color;
        }, 300);

        scoreLabel.textContent = label;
        scoreLabel.style.color = color;

        // Found Skills
        foundSkillsContainer.innerHTML = '';
        if (foundSkills.length === 0) {
            foundSkillsContainer.innerHTML = '<span class="text-secondary">No specific skills detected.</span>';
        } else {
            foundSkills.forEach((skill, index) => {
                const el = document.createElement('div');
                el.className = 'tag found';
                el.style.animationDelay = `${index * 0.05}s`;
                el.textContent = skill;
                foundSkillsContainer.appendChild(el);
            });
        }

        // Missing Skills
        missingSkillsContainer.innerHTML = '';
        if (missingSkills.length === 0) {
            missingSkillsContainer.innerHTML = '<span class="text-secondary">None detected.</span>';
        } else {
            missingSkills.forEach((skill, index) => {
                const el = document.createElement('div');
                el.className = 'tag missing';
                el.style.animationDelay = `${index * 0.05}s`;
                el.textContent = skill;
                missingSkillsContainer.appendChild(el);
            });
        }

        // Suggestions
        suggestionsList.innerHTML = '';
        suggestions.forEach((suggestion, index) => {
            const el = document.createElement('li');
            el.style.animationDelay = `${index * 0.1}s`;
            el.textContent = suggestion;
            suggestionsList.appendChild(el);
        });

        // ATS Rewritten Resume Logic
        if (actionType === 'ats' && data.rewritten_resume) {
            currentRewrittenResume = data.rewritten_resume;
            rewrittenResumeBox.textContent = currentRewrittenResume;
            rewrittenResumeGroup.classList.remove('hidden');
        } else {
            currentRewrittenResume = '';
            rewrittenResumeGroup.classList.add('hidden');
        }

        // Scroll to results on mobile
        if (window.innerWidth <= 900) {
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    function downloadOptimizedResume() {
        if (!currentRewrittenResume) return;

        // Fill the PDF template
        const pdfExperience = document.getElementById('pdf-experience');
        const pdfSkills = document.getElementById('pdf-skills');
        
        // Remove the top headers from the raw text for a cleaner look
        let cleanText = currentRewrittenResume.replace(/========================================\n          ATS OPTIMIZED RESUME          \n========================================\n\n/g, '');
        
        // Extract the skills tag block from the bottom
        let mainBody = cleanText.split("----------------------------------------")[0].trim();
        let skillsBlock = cleanText.split("SYSTEM ADDED ATS KEYWORDS (INVISIBLE TAGS):\n")[1];
        
        pdfExperience.textContent = mainBody;
        pdfSkills.textContent = skillsBlock ? skillsBlock.trim() : "Standard industry technical and soft skills.";

        const element = document.getElementById('pdf-template');
        
        // Clone the element and place it hidden behind the visible UI
        // This ensures html2canvas renders it perfectly without off-screen clipping bugs
        const clone = element.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.zIndex = '-9999';
        clone.style.width = '800px';
        document.body.appendChild(clone);

        const opt = {
            margin:       0.5,
            filename:     'ATS_Optimized_Resume.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(clone).save().then(() => {
            document.body.removeChild(clone);
        });
    }
});