document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const resumeInput = document.getElementById('resume-input');
    const fileUpload = document.getElementById('file-upload');
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-btn');
    const resultsSection = document.getElementById('results-section');
    const appGrid = document.querySelector('.app-grid');
    
    // Results Elements
    const scoreValue = document.getElementById('score-value');
    const scoreProgress = document.getElementById('score-progress');
    const scoreLabel = document.getElementById('score-label');
    const foundSkillsContainer = document.getElementById('found-skills');
    const missingSkillsContainer = document.getElementById('missing-skills');
    const suggestionsList = document.getElementById('suggestions-list');

    // Dictionaries
    const actionVerbs = [
        'achieved', 'improved', 'trained', 'managed', 'created', 'resolved', 
        'volunteered', 'influenced', 'increased', 'decreased', 'launched',
        'negotiated', 'developed', 'coordinated', 'led', 'designed', 'analyzed',
        'implemented', 'optimized', 'spearheaded', 'executed', 'built', 'directed'
    ];

    const hardSkills = [
        'python', 'java', 'javascript', 'c++', 'sql', 'html', 'css', 'react',
        'angular', 'node.js', 'aws', 'docker', 'kubernetes', 'git', 'agile',
        'machine learning', 'data analysis', 'excel', 'photoshop', 'illustrator',
        'figma', 'ui/ux', 'seo', 'marketing', 'salesforce', 'project management'
    ];

    const softSkills = [
        'communication', 'teamwork', 'leadership', 'problem solving', 'adaptability',
        'time management', 'critical thinking', 'creativity', 'collaboration',
        'work ethic', 'attention to detail', 'interpersonal', 'conflict resolution'
    ];

    // Common skills expected in a strong resume (to check against)
    const baselineSkills = [
        'communication', 'problem solving', 'teamwork', 'project management', 'leadership'
    ];

    // Event Listeners
    fileUpload.addEventListener('change', handleFileUpload);
    analyzeBtn.addEventListener('click', analyzeResume);
    clearBtn.addEventListener('click', clearInput);

    let uploadedText = '';
    
    // Clear uploaded text if user starts typing manually
    resumeInput.addEventListener('input', () => {
        uploadedText = '';
    });

    // Helper to escape regex characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Configure PDF.js worker
    if (window['pdfjs-dist/build/pdf']) {
        window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                uploadedText = event.target.result;
                resumeInput.value = `[File Uploaded: ${file.name}]\n\nClick "Analyze Resume" to evaluate your scores, or clear to type manually.`;
            };
            reader.readAsText(file);
        } else if (fileName.endsWith('.pdf')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                extractTextFromPDF(event.target.result, file.name);
            };
            reader.readAsArrayBuffer(file);
        } else if (fileName.endsWith('.docx')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                extractTextFromDOCX(event.target.result, file.name);
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert("Please upload a .txt, .pdf, or .docx file.");
        }
        // Reset file input
        e.target.value = '';
    }

    function extractTextFromPDF(arrayBuffer, fileName) {
        resumeInput.value = "Extracting text from PDF, please wait...";
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        
        if (!pdfjsLib) {
            resumeInput.value = "Error: PDF.js library failed to load.";
            return;
        }

        const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
        loadingTask.promise.then(pdf => {
            let maxPages = pdf.numPages;
            let countPromises = [];
            
            for (let j = 1; j <= maxPages; j++) {
                let page = pdf.getPage(j);
                countPromises.push(page.then(function(page) {
                    let textContent = page.getTextContent();
                    return textContent.then(function(text){
                        return text.items.map(function (s) { return s.str; }).join(' ');
                    });
                }));
            }
            
            Promise.all(countPromises).then(function (texts) {
                uploadedText = texts.join('\n');
                resumeInput.value = `[File Uploaded: ${fileName}]\n\nClick "Analyze Resume" to evaluate your scores, or clear to type manually.`;
            }).catch(error => {
                resumeInput.value = "Error extracting text from PDF pages.";
                console.error(error);
            });
            
        }).catch(error => {
            resumeInput.value = "Error reading PDF file. It might be corrupted or encrypted.";
            console.error(error);
        });
    }

    function extractTextFromDOCX(arrayBuffer, fileName) {
        resumeInput.value = "Extracting text from DOCX, please wait...";
        if (!window.mammoth) {
            resumeInput.value = "Error: Mammoth.js library failed to load.";
            return;
        }

        mammoth.extractRawText({arrayBuffer: arrayBuffer})
            .then(function(result){
                uploadedText = result.value;
                resumeInput.value = `[File Uploaded: ${fileName}]\n\nClick "Analyze Resume" to evaluate your scores, or clear to type manually.`;
                if (result.messages && result.messages.length > 0) {
                    console.warn("DOCX extraction warnings:", result.messages);
                }
            })
            .catch(function(error) {
                resumeInput.value = "Error extracting text from DOCX file.";
                console.error(error);
            });
    }

    function clearInput() {
        resumeInput.value = '';
        uploadedText = '';
        resultsSection.classList.add('hidden');
        resultsSection.style.display = 'none';
        appGrid.classList.remove('has-results');
        
        // reset circles
        scoreProgress.style.strokeDashoffset = 314;
    }

    function analyzeResume() {
        // Use uploaded text if present, otherwise use textarea value
        const textToAnalyze = uploadedText || resumeInput.value;
        const text = textToAnalyze.trim().toLowerCase();
        
        if (text.length < 50) {
            alert("Please enter a longer resume text for meaningful analysis.");
            return;
        }

        // Analysis
        const words = text.split(/\W+/).filter(w => w.length > 0);
        const wordCount = words.length;

        // Find Action Verbs
        const foundVerbs = new Set();
        actionVerbs.forEach(verb => {
            // Using regex to match whole words
            const regex = new RegExp(`\\b${escapeRegExp(verb)}\\b`, 'gi');
            if (regex.test(text)) foundVerbs.add(verb);
        });

        // Find Hard Skills
        const foundHardSkills = new Set();
        hardSkills.forEach(skill => {
            const regex = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'gi');
            if (regex.test(text)) foundHardSkills.add(skill);
        });

        // Find Soft Skills
        const foundSoftSkills = new Set();
        softSkills.forEach(skill => {
            const regex = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'gi');
            if (regex.test(text)) foundSoftSkills.add(skill);
        });

        const allFoundSkills = [...foundHardSkills, ...foundSoftSkills];

        // Find Missing Baseline Skills
        const missingBaseline = baselineSkills.filter(skill => {
            const regex = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'gi');
            return !regex.test(text);
        });

        // Generate Suggestions & Score
        let score = 5; // Base score
        let suggestions = [];

        // Length Check
        if (wordCount < 150) {
            suggestions.push("Resume too short. Expand on responsibilities and quantifiable achievements.");
            score -= 1;
        } else if (wordCount > 1000) {
            suggestions.push("Resume too long. Condense to highlight only the most relevant experiences.");
            score -= 1;
        } else {
            score += 1; // Good length
        }

        // Action Verbs Check
        if (foundVerbs.size < 5) {
            suggestions.push("Action verbs lacking. Replace weak verbs with strong ones like 'spearheaded' or 'optimized'.");
        } else if (foundVerbs.size > 10) {
            score += 2;
        } else {
            score += 1;
        }

        // Skills Check
        if (allFoundSkills.length < 3) {
            suggestions.push("Missing specific skills. Explicitly list hard and soft skills.");
            score -= 1;
        } else if (allFoundSkills.length > 8) {
            score += 2;
        } else {
            score += 1;
        }

        // Quantifiable Metrics Check (simple regex for numbers/percentages)
        // using double slash inside string literal block can be tricky if not parsed right, 
        // since we are writing this into a javascript file from json, double backslashes in regex literal? No, we shouldn't use double backslash unless we're using new RegExp().
        // For regex literals: /\d+%|\$?\d+[kKmM]?/g
        // Let's fix that below.
        const metricsRegex = /\d+%|\$?\d+[kKmM]?/g;
        const metrics = text.match(metricsRegex);
        if (!metrics || metrics.length < 2) {
            suggestions.push("Lacking quantifiable metrics. Add numbers, percentages, or dollar amounts to prove impact.");
        } else {
            score += 1;
        }

        // Cap score at 10 and ensure min is 1
        score = Math.max(1, Math.min(10, score));

        // Update UI
        updateResultsUI(score, allFoundSkills, missingBaseline, suggestions);
    }

    function updateResultsUI(score, foundSkills, missingSkills, suggestions) {
        // Show section
        appGrid.classList.add('has-results');
        resultsSection.style.display = 'flex';
        // Small timeout to allow display:flex to apply before animating opacity/transform
        setTimeout(() => {
            resultsSection.classList.remove('hidden');
        }, 50);

        // Update Score
        scoreValue.textContent = score;
        
        // Animate Circle
        // Max offset is 314 (0%). Min is 0 (100%).
        const offset = 314 - (314 * (score / 10));
        
        // Set color based on score
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

        // Update Found Skills
        foundSkillsContainer.innerHTML = '';
        if (foundSkills.length === 0) {
            foundSkillsContainer.innerHTML = '<span class="text-secondary" style="animation: scaleIn 0.3s ease-out forwards;">No specific skills detected.</span>';
        } else {
            // Show up to 15 skills to avoid clutter
            foundSkills.slice(0, 15).forEach((skill, index) => {
                const el = document.createElement('div');
                el.className = 'tag found';
                el.style.animationDelay = `${index * 0.05}s`;
                // capitalize first letter
                el.textContent = skill.charAt(0).toUpperCase() + skill.slice(1);
                foundSkillsContainer.appendChild(el);
            });
        }

        // Update Missing Skills
        missingSkillsContainer.innerHTML = '';
        if (missingSkills.length === 0) {
            missingSkillsContainer.innerHTML = '<span class="text-secondary" style="animation: scaleIn 0.3s ease-out forwards;">Core baseline skills detected.</span>';
        } else {
            missingSkills.forEach((skill, index) => {
                const el = document.createElement('div');
                el.className = 'tag missing';
                el.style.animationDelay = `${index * 0.05}s`;
                el.textContent = skill.charAt(0).toUpperCase() + skill.slice(1);
                missingSkillsContainer.appendChild(el);
            });
        }

        // Update Suggestions
        suggestionsList.innerHTML = '';
        if (suggestions.length === 0) {
            suggestionsList.innerHTML = '<li style="animation-delay: 0.1s">Strong baseline detected. Tailor keywords further for specific job descriptions.</li>';
        } else {
            suggestions.forEach((suggestion, index) => {
                const el = document.createElement('li');
                el.style.animationDelay = `${index * 0.1}s`;
                el.textContent = suggestion;
                suggestionsList.appendChild(el);
            });
        }
        
        // Scroll to results on mobile
        if (window.innerWidth <= 900) {
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
});
