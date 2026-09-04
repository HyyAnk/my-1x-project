import { useState } from "react";

const SAMPLE_QUESTIONS_EN = [
  {
    type: "standard" as const,
    text: "Which planet in our solar system has the most prominent rings?",
    choices: ["Jupiter", "Saturn", "Uranus"],
    correct: 1,
    fact_title: "DID YOU KNOW?",
    fact_text: "Saturn's rings are made mostly of billions of ice particles and rocky debris!",
  },
  {
    type: "short" as const,
    text: "What is the capital of France?",
    choices: ["Rome", "Berlin", "Paris"],
    correct: 2,
    fact_title: "DID YOU KNOW?",
    fact_text: "Paris was originally a Roman city called Lutetia over 2,000 years ago!",
  },
  {
    type: "long" as const,
    text: "Which ancient civilization constructed the massive stone monuments known as the Great Pyramids of Giza along the Nile River?",
    choices: ["Ancient Mesopotamia", "Ancient Egypt", "Mayan Civilization"],
    correct: 1,
    fact_title: "DID YOU KNOW?",
    fact_text: "The Great Pyramid of Giza was the tallest man-made structure for more than 3,800 years!",
  },
  {
    type: "true_false" as const,
    text: "Is the Great Wall of China visible from the Moon with the naked eye?",
    choices: ["True", "False"],
    correct: 1,
    fact_title: "DID YOU KNOW?",
    fact_text: "It is an urban myth! The Great Wall is not visible from the Moon without magnification.",
  },
  {
    type: "versus" as const,
    text: "Which apex predator is heavier in average adult body weight?",
    choices: ["African Lion", "Siberian Tiger"],
    correct: 1,
    fact_title: "DID YOU KNOW?",
    fact_text: "The Siberian Tiger can weigh over 300 kg, making it noticeably larger than a lion!",
  },
];

const SAMPLE_QUESTIONS_VI = [
  {
    type: "standard" as const,
    text: "Hành tinh nào trong hệ Mặt Trời có hệ thống vành đai nổi bật nhất?",
    choices: ["Sao Mộc", "Sao Thổ", "Sao Thiên Vương"],
    correct: 1,
    fact_title: "BẠN CÓ BIẾT?",
    fact_text: "Vành đai của Sao Thổ chủ yếu cấu tạo từ hàng tỷ hạt băng, bụi và đá vụn!",
  },
  {
    type: "short" as const,
    text: "Thủ đô của nước Pháp là gì?",
    choices: ["Rome", "Berlin", "Paris"],
    correct: 2,
    fact_title: "BẠN CÓ BIẾT?",
    fact_text: "Tháp Eiffel tại Paris từng là công trình nhân tạo cao nhất thế giới trong hơn 40 năm!",
  },
  {
    type: "long" as const,
    text: "Nền văn minh cổ đại nào đã xây dựng các công trình kim tự tháp Giza khổng lồ dọc theo dòng sông Nile?",
    choices: ["Lưỡng Hà cổ đại", "Ai Cập cổ đại", "Văn minh Maya"],
    correct: 1,
    fact_title: "BẠN CÓ BIẾT?",
    fact_text: "Đại kim tự tháp Giza từng là công trình nhân tạo cao nhất thế giới trong hơn 3.800 năm!",
  },
  {
    type: "true_false" as const,
    text: "Vạn Lý Trường Thành có thể nhìn thấy từ Mặt Trăng bằng mắt thường?",
    choices: ["Đúng", "Sai"],
    correct: 1,
    fact_title: "BẠN CÓ BIẾT?",
    fact_text: "Đây là một hiểu lầm phổ biến! Không thể nhìn thấy Vạn Lý Trường Thành từ Mặt Trăng bằng mắt thường.",
  },
  {
    type: "versus" as const,
    text: "Loài thú họ mèo nào có trọng lượng và kích thước trung bình lớn hơn?",
    choices: ["Sư tử châu Phi", "Hổ Siberia"],
    correct: 1,
    fact_title: "BẠN CÓ BIẾT?",
    fact_text: "Hổ Siberia có thể nặng trên 300 kg, lớn hơn đáng kể so với sư tử châu Phi!",
  },
];

export type PresetSampleQuestion = (typeof SAMPLE_QUESTIONS_EN)[number];

export function useSandboxQuestionState(language: string) {
  const sampleQuestions = language === "vi" ? SAMPLE_QUESTIONS_VI : SAMPLE_QUESTIONS_EN;
  const [questionText, setQuestionText] = useState(sampleQuestions[0].text);
  const [choices, setChoices] = useState<string[]>(sampleQuestions[0].choices);
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState(sampleQuestions[0].correct);
  const [factCardTitle, setFactCardTitle] = useState(sampleQuestions[0].fact_title);
  const [factCardText, setFactCardText] = useState(sampleQuestions[0].fact_text);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);

  const handleApplyPresetQuestion = (sample: (typeof sampleQuestions)[number]) => {
    setQuestionText(sample.text);
    setChoices([...sample.choices]);
    setCorrectChoiceIndex(sample.correct);
    if (sample.fact_title) setFactCardTitle(sample.fact_title);
    if (sample.fact_text) setFactCardText(sample.fact_text);
  };

  return {
    sampleQuestions,
    questionText,
    setQuestionText,
    choices,
    setChoices,
    correctChoiceIndex,
    setCorrectChoiceIndex,
    factCardTitle,
    factCardText,
    setFactCardText,
    questionNumber,
    setQuestionNumber,
    totalQuestions,
    setTotalQuestions,
    handleApplyPresetQuestion,
  };
}

export type SandboxQuestionState = ReturnType<typeof useSandboxQuestionState>;
