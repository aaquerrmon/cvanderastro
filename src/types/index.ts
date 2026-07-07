export interface Experience {
  id: number;
  company: string;
  position: string;
  type: string;
  startDate: string;
  endDate: string | null;
  location: string;
  description: string;
  technologies: string[];
}

export interface Education {
  id: number;
  degree: string;
  field: string;
  institution: string;
  url: string;
  startDate: string;
  endDate: string;
  description: string;
  highlights: string[];
}

export interface Project {
  id: number;
  fullname: string;
  description: string;
  html_url: string;
  private: boolean;
  language: string[];
  bannerImage?: string;
}

export interface LinkedInPost {
  id: number;
  date: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  image: string;
}

export interface CVData {
  name: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  bio: string;
  skills: string[];
  social: {
    github: string;
    linkedin: string;
    email: string;
  };
}
