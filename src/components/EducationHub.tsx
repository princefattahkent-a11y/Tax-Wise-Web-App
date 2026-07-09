import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { supabase } from "../lib/supabaseClient";
import { C, levelColors } from "../lib/constants";
import { Badge, Button, Card, ProgressBar } from "./UI";
import { Clock, Check, Sparkles, BookOpen, GraduationCap, Scale, Award } from "lucide-react";

const getCourseIcon = (emoji: string, size = 32, color?: string) => {
  switch (emoji) {
    case "⚖️": return <Scale size={size} style={{ color }} />;
    case "🎓": return <GraduationCap size={size} style={{ color }} />;
    case "📜": return <BookOpen size={size} style={{ color }} />;
    case "🏆": return <Award size={size} style={{ color }} />;
    default: return <BookOpen size={size} style={{ color }} />;
  }
};

interface Lesson {
  id: string;
  title: string;
  duration: string;
  content: string;
}

interface Course {
  id: number;
  title: string;
  level: "Beginner" | "Intermediate" | "Professional";
  emoji: string;
  color: string;
  accent_color: string;
  description: string;
  lessons: Lesson[];
}

interface Enrollment {
  id: string;
  course_id: number;
  progress: number;
  completed_lessons: string[];
}

interface EducationHubProps {
  user: {
    id: string;
  };
}

export const EducationHub: React.FC<EducationHubProps> = ({ user }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 24 } }
  };

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Record<number, Enrollment>>({});
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  
  // AI Tutor state
  const [aiQ, setAiQ] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("id", { ascending: true });

      if (coursesError) throw coursesError;

      // Fetch user's enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id);

      if (enrollmentsError) throw enrollmentsError;

      if (coursesData) setCourses(coursesData as Course[]);
      
      const enrollMap: Record<number, Enrollment> = {};
      if (enrollmentsData) {
        enrollmentsData.forEach((e) => {
          enrollMap[e.course_id] = e as Enrollment;
        });
      }
      setEnrollments(enrollMap);
    } catch (err) {
      console.error("Error loading education hub data:", err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const startOrLoadCourse = async (course: Course) => {
    setActiveCourse(course);
    setActiveLesson(null);
    setAiQ("");
    setAiAnswer("");

    // If not enrolled, create enrollment
    if (!enrollments[course.id]) {
      try {
        const { data: newEnrollment, error } = await supabase
          .from("enrollments")
          .insert({
            user_id: user.id,
            course_id: course.id,
            progress: 0,
            completed_lessons: [],
          })
          .select()
          .single();

        if (error) throw error;
        
        if (newEnrollment) {
          setEnrollments((prev) => ({
            ...prev,
            [course.id]: newEnrollment as Enrollment,
          }));
        }
      } catch (err) {
        console.error("Failed to enroll user in course:", err);
      }
    }
  };

  const markLessonComplete = async (lessonId: string) => {
    if (!activeCourse) return;
    const currentEnrollment = enrollments[activeCourse.id];
    if (!currentEnrollment) return;

    // Check if already completed
    if (currentEnrollment.completed_lessons.includes(lessonId)) {
      setActiveLesson(null);
      return;
    }

    const updatedCompleted = [...currentEnrollment.completed_lessons, lessonId];
    const calculatedProgress = Math.round((updatedCompleted.length / activeCourse.lessons.length) * 100);

    try {
      const { error } = await supabase
        .from("enrollments")
        .update({
          completed_lessons: updatedCompleted,
          progress: calculatedProgress,
          completed_at: calculatedProgress === 100 ? new Date().toISOString() : null,
        })
        .eq("id", currentEnrollment.id);

      if (error) throw error;

      // Update local state
      setEnrollments((prev) => ({
        ...prev,
        [activeCourse.id]: {
          ...prev[activeCourse.id],
          completed_lessons: updatedCompleted,
          progress: calculatedProgress,
        },
      }));
      
      setActiveLesson(null);
    } catch (err) {
      console.error("Failed to save lesson completion:", err);
    }
  };

  const askAI = async () => {
    if (!aiQ.trim() || !activeCourse) return;
    setAiLoading(true);
    setAiAnswer("");
    
    try {
      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseTitle: activeCourse.title,
          lessonTitle: activeLesson?.title || "Course Overview",
          question: aiQ,
        }),
      });

      const data = await res.json().catch(() => ({ error: `Unexpected response from AI tutor (${res.status})` }));
      if (!res.ok) {
        throw new Error(data.error || `AI tutor endpoint failed with status ${res.status}`);
      }
      if (data.error) throw new Error(data.error);

      setAiAnswer(data.answer);
    } catch (err: unknown) {
      console.error("AI Tutor call error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setAiAnswer(
        `Tutor is currently offline. ${message}. Please check that GEMINI_API_KEY is configured in your deployment environment.`
      );
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
        <div style={{ fontSize: "1.8rem", animation: "spin 1s linear infinite", marginBottom: 10 }}>⟳</div>
        <div>Loading courses...</div>
      </div>
    );
  }

  // Active Lesson view
  if (activeLesson && activeCourse) {
    const enrollment = enrollments[activeCourse.id];
    const isCompleted = enrollment?.completed_lessons.includes(activeLesson.id);
    const [lColor] = levelColors[activeCourse.level] || [C.teal, C.tealLight];

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <button
            onClick={() => {
              setActiveLesson(null);
              setAiQ("");
              setAiAnswer("");
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.teal,
              fontWeight: 700,
              fontSize: "0.875rem",
              marginBottom: 24,
              padding: 0,
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Back to {activeCourse.title}
          </button>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(300px, 340px)", gap: 28, alignItems: "start" }}>
          <motion.div variants={itemVariants}>
            <Card style={{ padding: 36 }}>
            <Badge color={lColor} bg={levelColors[activeCourse.level]?.[1] || C.tealLight}>
              {activeCourse.level}
            </Badge>
            
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", color: C.navy, fontSize: "1.6rem", margin: "14px 0 8px", fontWeight: 800 }}>
              {activeLesson.title}
            </h2>
            
            <div style={{ fontSize: "0.8rem", color: C.muted, marginBottom: 28, display: "flex", alignItems: "center", gap: 12, fontWeight: 600 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Clock size={12} />
                <span>{activeLesson.duration}</span>
              </span>
              <span>•</span>
              <span>{activeCourse.title}</span>
            </div>
            
            <div style={{ fontSize: "0.925rem", color: C.text, lineHeight: 1.85, whiteSpace: "pre-line", fontWeight: 500 }}>
              {activeLesson.content.split("**").map((part, i) =>
                i % 2 === 1 ? <strong key={i} style={{ color: C.navy, fontWeight: 700 }}>{part}</strong> : part
              )}
            </div>

            <div style={{ marginTop: 32, display: "flex", gap: 12, borderTop: "1px solid rgba(15,32,68,0.05)", paddingTop: 24 }}>
              <Button onClick={() => markLessonComplete(activeLesson.id)} disabled={isCompleted} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {isCompleted ? (
                  <>
                    <Check size={14} strokeWidth={3} />
                    <span>Course Lesson Cleared</span>
                  </>
                ) : (
                  <>
                    <span>Mark as Complete</span>
                    <Check size={14} strokeWidth={3} />
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => { setActiveLesson(null); setAiQ(""); setAiAnswer(""); }}>
                Back to Lessons
              </Button>
            </div>
          </Card>
          </motion.div>

          <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Progress checklist sidebar */}
            <Card style={{ padding: 24 }}>
              <div style={{ fontWeight: 800, color: C.navy, marginBottom: 16, fontSize: "0.95rem" }}>
                Course Modules
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {activeCourse.lessons.map((l, i) => {
                  const lessonDone = enrollment?.completed_lessons.includes(l.id);
                  const isCurrent = l.id === activeLesson.id;

                  return (
                    <div
                      key={l.id}
                      onClick={() => {
                        setActiveLesson(l);
                        setAiQ("");
                        setAiAnswer("");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: i < activeCourse.lessons.length - 1 ? `1px solid rgba(15,32,68,0.03)` : "none",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = "translateX(2px)"}
                      onMouseOut={e => e.currentTarget.style.transform = "none"}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: lessonDone ? C.teal : isCurrent ? C.navy : C.offwhite,
                          border: `2px solid ${lessonDone ? C.teal : isCurrent ? C.navy : C.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.72rem",
                          color: lessonDone || isCurrent ? C.white : C.muted,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {lessonDone ? <Check size={12} strokeWidth={3} /> : i + 1}
                      </div>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: isCurrent ? C.navy : C.text,
                          fontWeight: isCurrent ? 700 : 500,
                          flex: 1,
                          lineHeight: 1.4,
                        }}
                      >
                        {l.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* AI Tutor Chat log */}
            <Card style={{ padding: 24 }}>
              <div style={{ fontWeight: 800, color: C.navy, marginBottom: 10, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={16} style={{ color: C.gold }} />
                <span>AI Lesson Tutor</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>
                Ask any contextual question regarding this lesson to clarify Uganda tax guidelines.
              </p>

              {/* Chat thread display */}
              {aiAnswer && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, maxHeight: 220, overflowY: "auto", padding: "4px" }}>
                  {/* User question bubble */}
                  <div style={{ alignSelf: "flex-end", background: C.navy, color: C.white, borderRadius: "12px 12px 0 12px", padding: "10px 14px", fontSize: "0.82rem", maxWidth: "85%", fontWeight: 500 }}>
                    {aiQ}
                  </div>
                  {/* AI Response bubble */}
                  <div style={{ alignSelf: "flex-start", background: C.tealLight, color: C.navy, borderRadius: "12px 12px 12px 0", padding: "10px 14px", fontSize: "0.82rem", maxWidth: "85%", border: `1px solid ${C.teal}18` }}>
                    <div style={{ fontSize: "0.68rem", fontWeight: 800, color: C.teal, marginBottom: 4 }}>TUTOR RESPONSE</div>
                    <span style={{ fontWeight: 500, lineHeight: 1.6 }}>{aiAnswer}</span>
                  </div>
                </div>
              )}

              <textarea
                value={aiQ}
                onChange={(e) => setAiQ(e.target.value)}
                placeholder="Type your query regarding this tax unit..."
                className="input-focus-ring"
                style={{
                  width: "100%",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                  resize: "none",
                  minHeight: 70,
                  outline: "none",
                  boxSizing: "border-box",
                  background: C.offwhite,
                  color: C.text,
                  transition: "all 0.2s"
                }}
              />
              <Button onClick={askAI} disabled={aiLoading || !aiQ.trim()} small style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>
                {aiLoading ? "⟳ Consulting Tutor..." : "Ask AI Tutor →"}
              </Button>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Course Overview view
  if (activeCourse) {
    const enrollment = enrollments[activeCourse.id];
    const completedCount = enrollment?.completed_lessons.length || 0;
    const progressPercent = enrollment?.progress || 0;
    const [lColor, lBg] = levelColors[activeCourse.level] || [C.teal, C.tealLight];

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <button
            onClick={() => setActiveCourse(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.teal,
              fontWeight: 700,
              fontSize: "0.875rem",
              marginBottom: 24,
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            ← Back to All Courses
          </button>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(280px, 320px)", gap: 28, alignItems: "start" }}>
          <motion.div variants={itemVariants}>
            <div style={{ background: lBg, borderRadius: 20, padding: 36, marginBottom: 24, border: `1px solid ${lColor}15` }}>
              <div style={{ marginBottom: 14 }}>{getCourseIcon(activeCourse.emoji, 44, lColor)}</div>
              <Badge color={lColor} bg={C.white} style={{ boxShadow: "0 2px 8px rgba(15,32,68,0.02)" }}>
                {activeCourse.level}
              </Badge>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", color: C.navy, fontSize: "1.7rem", margin: "14px 0 8px", fontWeight: 800 }}>
                {activeCourse.title}
              </h1>
              <p style={{ color: C.muted, fontSize: "0.92rem", lineHeight: 1.7, fontWeight: 500 }}>{activeCourse.description}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeCourse.lessons.map((l, i) => {
                const lessonDone = enrollment?.completed_lessons.includes(l.id);
                return (
                  <Card
                    key={l.id}
                    hover
                    style={{ padding: "18px 24px", cursor: "pointer" }}
                    onClick={() => setActiveLesson(l)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: lessonDone ? C.teal : C.offwhite,
                          border: `2px solid ${lessonDone ? C.teal : C.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.875rem",
                          color: lessonDone ? C.white : C.muted,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {lessonDone ? <Check size={14} strokeWidth={3} /> : i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: C.navy, fontSize: "0.92rem" }}>{l.title}</div>
                        <div style={{ fontSize: "0.76rem", color: C.muted, marginTop: 3, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} />
                          <span>{l.duration}</span>
                        </div>
                      </div>
                      <span style={{ color: C.teal, fontSize: "1.1rem", fontWeight: 700 }}>→</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card style={{ padding: 24 }}>
              <div style={{ fontWeight: 800, color: C.navy, marginBottom: 12, fontSize: "0.95rem" }}>Your Progress</div>
              {/* Custom Gradient Progress Bar */}
              <ProgressBar progress={progressPercent} color={`linear-gradient(90deg, ${C.teal} 0%, ${C.gold} 100%)`} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: "0.82rem", color: C.muted, fontWeight: 500 }}>
                {completedCount} of {activeCourse.lessons.length} modules cleared ({progressPercent}%)
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.85rem", color: C.navy, marginBottom: 6, fontWeight: 800 }}>
          Learning Hub
        </h1>
        <p style={{ color: C.muted, fontSize: "0.92rem", fontWeight: 500 }}>
          Structured, CPD-eligible Uganda tax courses — from foundations to TAT dispute litigation.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        {courses.map((c) => {
          const enrollment = enrollments[c.id];
          const progressPercent = enrollment?.progress || 0;
          const [lColor, lBg] = levelColors[c.level] || [C.teal, C.tealLight];

          return (
            <Card key={c.id} hover style={{ cursor: "pointer", display: "flex", flexDirection: "column", height: "100%" }} onClick={() => startOrLoadCourse(c)}>
              <div
                style={{
                  height: 120,
                  background: lBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderBottom: "1px solid rgba(15,32,68,0.03)"
                }}
              >
                {getCourseIcon(c.emoji, 48, lColor)}
              </div>
              <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column" }}>
                <div>
                  <Badge color={lColor} bg={lBg}>
                    {c.level}
                  </Badge>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", color: C.navy, margin: "14px 0 8px", fontSize: "1.05rem", fontWeight: 800 }}>
                    {c.title}
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: C.muted, lineHeight: 1.6, marginBottom: 20, fontWeight: 500 }}>
                    {c.description}
                  </p>
                </div>
                
                <div style={{ marginTop: "auto", paddingTop: 8 }}>
                  <ProgressBar progress={progressPercent} color={C.teal} style={{ height: 6 }} />
                </div>
              </div>
              <div
                style={{
                  borderTop: `1px solid rgba(15,32,68,0.05)`,
                  padding: "16px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(15,32,68,0.01)"
                }}
              >
                <span style={{ fontSize: "0.78rem", color: C.muted, fontWeight: 600 }}>
                  {c.lessons.length} Modules · {c.title.includes("Appeals") ? "4 hrs" : c.title.includes("eFRIS") ? "2.5 hrs" : "3 hrs"}
                </span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: C.teal }}>
                  {progressPercent > 0 ? `Resume (${progressPercent}%) →` : "Begin →"}
                </span>
              </div>
            </Card>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
