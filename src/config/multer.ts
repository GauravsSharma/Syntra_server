import multer from "multer";

const storage = multer.memoryStorage(); // ya diskStorage
export const upload = multer({ storage });
