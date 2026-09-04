import type { QuizQuestionFormat } from "./enums/quiz/pipelineEnums.js";
import type { ResolvedQuizLayoutId } from "./quizLayouts.catalog.js";

export type QuizGameplayArchetypeId =
  | "deep_trivia"
  | "visual_spotting"
  | "verdict_fact_myth"
  | "versus_faceoff"
  | "visual_identification"
  | "speed_blitz"
  | "mystery_reveal";

export interface QuizGameplayArchetypeBlueprint {
  id: QuizGameplayArchetypeId;
  name: string;
  description: string;
  defaultFormat: QuizQuestionFormat;
  targetLayout: ResolvedQuizLayoutId;
  creativeAngles: readonly string[];
}

export const QUIZ_GAMEPLAY_ARCHETYPES: readonly QuizGameplayArchetypeBlueprint[] = [
  {
    id: "deep_trivia",
    name: "Deep Trivia",
    description: "Câu đố kiến thức hoặc câu chuyện chiều sâu với 1 hình ảnh chủ thể nổi bật bên trái và 3 phương án lựa chọn bên phải.",
    defaultFormat: "multiple_choice",
    targetLayout: "media_left_choices_right",
    creativeAngles: ["Bí mật lịch sử", "Hiện tượng tự nhiên kỳ thú", "Khám phá thế giới", "Hồ sơ nhân vật & địa danh"],
  },
  {
    id: "visual_spotting",
    name: "Visual Spotting (Soi Tranh)",
    description: "Câu đố thử thách thị giác, tìm hình khác biệt hoặc nhận diện chi tiết giả lập với 3 ảnh phóng to không chữ.",
    defaultFormat: "odd_one_out",
    targetLayout: "visual_choices_three_pure",
    creativeAngles: ["Tìm điểm bất thường", "Thật vs AI Generator", "Soi tranh tìm chi tiết sai", "Ai là hung thủ qua hình ảnh"],
  },
  {
    id: "verdict_fact_myth",
    name: "Fact or Myth (Thật hay Giả)",
    description: "Câu đố phán xét Đúng/Sai với 1 hình ảnh minh họa chủ đề lớn và 2 nút phán xét ĐÚNG - SAI khổng lồ.",
    defaultFormat: "true_false",
    targetLayout: "verdict_true_false",
    creativeAngles: ["Kiểm chứng tin đồn & lầm tưởng", "Sự thật bất ngờ về cơ thể người", "Huyền thoại vs Thực tế", "Luật lệ kỳ lạ thế giới"],
  },
  {
    id: "versus_faceoff",
    name: "Versus Face-off (Đối Đầu 1v1)",
    description: "So kèo đối đầu giữa 2 thực thể hoặc nhân vật với 2 cột so sánh cân bằng A vs B.",
    defaultFormat: "multiple_choice",
    targetLayout: "split_versus_two",
    creativeAngles: ["Ai mạnh hơn / Ai nhanh hơn", "So sánh kích thước & sức mạnh", "Chọn phe / Bạn thuộc team nào", "Đối đầu lịch sử"],
  },
  {
    id: "visual_identification",
    name: "Visual Identification (Nhận Diện Hình Ảnh)",
    description: "Nhận diện sự vật, đồ vật hoặc sinh vật thông qua 3 thẻ ảnh có nhãn định danh cụ thể.",
    defaultFormat: "multiple_choice",
    targetLayout: "visual_choices_three",
    creativeAngles: ["Nhìn bóng đoán vật", "Đoán tên loài vật qua bộ phận", "Nhận diện cờ quốc gia / biểu tượng", "Ai là người sở hữu món đồ"],
  },
  {
    id: "speed_blitz",
    name: "Speed Blitz (Phản Xạ Nhanh)",
    description: "Câu đố mẹo, toán tư duy hoặc phản xạ ngôn ngữ dạng text thuần tập trung, tối đa tốc độ.",
    defaultFormat: "multiple_choice",
    targetLayout: "full_stack_list",
    creativeAngles: ["Câu đố mẹo dân gian", "Toán đố logic nhanh", "Tìm từ đồng nghĩa / chơi chữ", "Thử tài tính nhẩm"],
  },
  {
    id: "mystery_reveal",
    name: "Mystery Reveal (Đoán Mở & Lật Mở Kết Quả)",
    description: "Câu đố bí ẩn thị giác (nhìn bóng đoán vật, manh mối tìm thủ phạm, dụng cụ đoán nghề) với Hero Stage khổng lồ chuyển đổi trạng thái khi reveal.",
    defaultFormat: "image_guess",
    targetLayout: "mystery_reveal",
    creativeAngles: [
      "Who's that character / Silhouette bóng đen",
      "Chiếc hang này của con gì / Manh mối dấu vết",
      "Dụng cụ này của nghề nghiệp nào",
      "Soi kính hiển vi / Cận cảnh đoán vật",
      "Biến đổi thời gian / Quá khứ vs Hiện tại",
    ],
  },
] as const;

export function getQuizGameplayArchetype(id: QuizGameplayArchetypeId): QuizGameplayArchetypeBlueprint | undefined {
  return QUIZ_GAMEPLAY_ARCHETYPES.find((archetype) => archetype.id === id);
}
