'use client';

import React, { useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useUserContext } from '../contexts/UserContext';
import { Music, Star, Users, Calendar, Sparkles, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useUser();
  const { isAdmin, isCreator, isStudent, loadingRoles } = useUserContext();
  const router = useRouter();

  useEffect(() => {
    if (user && !loadingRoles) {
      if (isAdmin) router.replace('/admin/dashboard');
      else if (isCreator) router.replace('/creator/dashboard');
      else router.replace('/student/dashboard');
    }
  }, [user, loadingRoles, isAdmin, isCreator, isStudent, router]);

  if (isLoading || (user && loadingRoles)) {
    return (
      <div className="min-h-screen bg-[#FFFCF5] flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dash-primary mx-auto mb-4" />
          <p className="text-text-light text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="bg-background-light font-body text-text-light min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="py-6 flex justify-between items-center">
          <a className="text-3xl font-display" href="#">
            <span className="logo-m text-primary">M</span>oonriver
          </a>
          <nav className="hidden md:flex items-center space-x-8">
            <a className="hover:text-primary transition-colors" href="#courses">Courses</a>
            <a className="hover:text-primary transition-colors" href="#features">Features</a>
            <a className="hover:text-primary transition-colors" href="#testimonials">Testimonials</a>
          </nav>
          <button
            onClick={() => (window.location.href = '/auth/login')}
            className="bg-mango-orange text-white px-6 py-2 rounded-full font-semibold hover:bg-opacity-90 transition-all shadow-md"
          >
            Get Started
          </button>
        </header>

        {/* Hero */}
        <section className="text-center py-20 lg:py-32">
          <div className="inline-flex items-center bg-orange-100 text-dash-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            AI-Powered Music Education
          </div>
          <h1 className="text-5xl md:text-7xl font-bold font-display leading-tight">
            Unlock Your<br />Musical <span className="text-primary">Potential</span>
          </h1>
          <p className="mt-6 text-lg max-w-2xl mx-auto text-gray-600">
            Join Moonriver to learn music from world-class creators. Smart scheduling with Google Calendar,
            personalized AI assistance, and role-based dashboards for students, creators, and admins.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => (window.location.href = '/auth/login')}
              className="bg-primary text-white px-10 py-4 rounded-full font-semibold text-lg hover:bg-opacity-90 shadow-lg transition-all flex items-center"
            >
              Join as Student
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={() => (window.location.href = '/auth/login?returnTo=/api/assign-role?role=creator')}
              className="border-2 border-dash-primary text-dash-primary px-10 py-4 rounded-full font-semibold text-lg hover:bg-orange-50 transition-all"
            >
              Join as Creator
            </button>
          </div>
        </section>

        {/* Features */}
        <section className="py-20" id="features">
          <h2 className="text-4xl font-bold font-display text-center mb-4">Why Moonriver?</h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            A complete platform for music education with smart features for every user.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: 'Role-Based Access', desc: 'Separate dashboards for students, creators, and admins with Auth0 security.' },
              { icon: Calendar, title: 'Google Calendar', desc: 'Sync appointments directly to your Google Calendar for seamless scheduling.' },
              { icon: Sparkles, title: 'AI RAG Search', desc: 'Admins can search all platform data with AI-powered retrieval augmented generation.' },
              { icon: Music, title: 'Rich Courses', desc: 'Browse, enroll, and track progress across diverse music courses.' },
            ].map((feature) => (
              <div key={feature.title} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-dash-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Courses Preview */}
        <section className="py-20" id="courses">
          <h2 className="text-4xl font-bold font-display text-center mb-12">Our Courses</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Guitar Lessons',
                desc: 'From acoustic to electric, master the strings with our comprehensive guitar curriculum.',
                img: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&h=400&fit=crop',
              },
              {
                title: 'Piano & Keyboard',
                desc: 'Unlock the world of melodies and harmonies on the piano, from classical to pop.',
                img: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&h=400&fit=crop',
              },
              {
                title: 'Vocal Training',
                desc: 'Find your voice and sing with confidence with our expert vocal coaching.',
                img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
              },
            ].map((course) => (
              <div
                key={course.title}
                className="bg-white rounded-xl shadow-sm overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 border border-gray-100"
              >
                <img alt={course.title} className="w-full h-56 object-cover" src={course.img} />
                <div className="p-6">
                  <h3 className="text-2xl font-bold font-display text-primary">{course.title}</h3>
                  <p className="mt-2 text-gray-600">{course.desc}</p>
                  <button
                    onClick={() => (window.location.href = '/auth/login')}
                    className="mt-4 bg-mango-light text-text-light font-semibold px-4 py-2 rounded-full hover:bg-opacity-90 transition-all"
                  >
                    Learn More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-mango-light/20 rounded-2xl px-8" id="testimonials">
          <h2 className="text-4xl font-bold font-display text-center mb-12">What Our Students Say</h2>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            {[
              {
                name: 'Sarah L.',
                text: '"Moonriver has completely changed my approach to music. The AI assistant helps me find the perfect courses, and the Google Calendar integration keeps me on track!"',
                img: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop',
                stars: 5,
              },
              {
                name: 'Mike R.',
                text: '"As a creator, the dashboard gives me everything I need to manage my students and schedule. The platform is beautifully designed and intuitive."',
                img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
                stars: 5,
              },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <img alt={t.name} className="w-12 h-12 rounded-full object-cover mr-4" src={t.img} />
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <div className="flex text-primary">
                      {Array.from({ length: t.stars }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">{t.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 mt-20 border-t border-gray-200">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <a className="text-3xl font-display" href="#">
                <span className="logo-m text-primary">M</span>oonriver
              </a>
              <p className="mt-4 text-gray-600">Your journey to musical mastery starts here.</p>
            </div>
            <div>
              <h4 className="font-semibold text-lg">Quick Links</h4>
              <ul className="mt-4 space-y-2">
                <li><a className="hover:text-primary transition-colors" href="#courses">Courses</a></li>
                <li><a className="hover:text-primary transition-colors" href="#features">Features</a></li>
                <li><a className="hover:text-primary transition-colors" href="#testimonials">Testimonials</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-lg">Platform</h4>
              <ul className="mt-4 space-y-2 text-gray-600">
                <li>Auth0 Authentication</li>
                <li>Google Calendar Integration</li>
                <li>AI-Powered RAG Search</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-500 text-sm">
            &copy; 2026 Moonriver Music. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}
