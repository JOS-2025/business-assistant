import React from "react";
import { 
  Shield, 
  FileText, 
  Lock, 
  ChevronLeft, 
  Scale, 
  UserCheck, 
  Database, 
  Globe 
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { motion } from "motion/react";

export default function Policies() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Privacy Policy",
      icon: <Lock className="w-5 h-5 text-emerald-600" />,
      content: `We value your privacy. Business Assistant AI collects minimal data required to provide our services. 
      Your business data, including transactions, stock levels, and customer information, is stored securely 
      and is never shared with third parties for marketing purposes. We use industry-standard encryption 
      to protect your data both in transit and at rest.`
    },
    {
      title: "Terms of Service",
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      content: `By using Business Assistant AI, you agree to provide accurate information and maintain the 
      security of your account. The service is provided "as is" without warranties of any kind. 
      We reserve the right to modify or terminate the service at any time. You are responsible for 
      complying with local tax and business regulations in your jurisdiction.`
    },
    {
      title: "Data Security",
      icon: <Shield className="w-5 h-5 text-purple-600" />,
      content: `Your data is hosted on secure cloud infrastructure with regular backups. We implement 
      role-based access control (RBAC) to ensure that only authorized staff members can access 
      sensitive business information. We recommend using strong passwords and enabling any 
      available multi-factor authentication.`
    },
    {
      title: "Refund Policy",
      icon: <Scale className="w-5 h-5 text-amber-600" />,
      content: `If you are on a paid plan, you may cancel your subscription at any time. Refunds are 
      generally not provided for partial months of service, but we may make exceptions in cases 
      of service interruptions or technical failures on our end.`
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full">
      <header className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">App Policies</h1>
          <p className="text-sm text-slate-500">Legal and privacy information.</p>
        </div>
      </header>

      <div className="space-y-6">
        {sections.map((section, idx) => (
          <motion.section 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-xl">
                {section.icon}
              </div>
              <h2 className="font-bold text-slate-800">{section.title}</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {section.content}
            </p>
          </motion.section>
        ))}
      </div>

      <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Globe className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Compliance</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Business Assistant AI is designed to be compliant with global data protection standards (GDPR/CCPA) 
          while remaining simple enough for small business owners in any region.
        </p>
        <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <span>Last Updated: March 2026</span>
          <span>v2.1.0</span>
        </div>
      </div>
    </div>
  );
}
