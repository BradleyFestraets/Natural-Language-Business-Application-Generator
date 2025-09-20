
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Shield, TrendingUp, Users, Clock, DollarSign } from 'lucide-react';

export default function EnterpriseLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-6 text-lg px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            🚀 Fortune 500 Ready • BMAD Methodology Powered
          </Badge>
          
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Transform Ideas into
            <span className="block text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
              Enterprise Applications
            </span>
            in Minutes
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The world's first Natural Language Business Application Generator with integrated BMAD methodology. 
            Generate full-stack enterprise applications from simple descriptions in under 15 minutes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Schedule Enterprise Demo
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4">
              Calculate Your ROI
            </Button>
          </div>
          
          <div className="flex justify-center items-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              SOC 2 Type II
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              GDPR Compliant
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              99.9% Uptime SLA
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Why Fortune 500 Choose Our Platform</h2>
            <p className="text-xl text-gray-600">Proven results across enterprise deployments</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>99.9% Time Reduction</CardTitle>
                <CardDescription>From 6-12 months to under 15 minutes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600 mb-2">$150K+</p>
                <p className="text-gray-600">Average savings per application</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>900% Productivity Gain</CardTitle>
                <CardDescription>BMAD methodology optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600 mb-2">450%</p>
                <p className="text-gray-600">Average ROI within 12 months</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>Bank-grade security & compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600 mb-2">100%</p>
                <p className="text-gray-600">Compliance-ready deployments</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* BMAD Methodology */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 text-lg px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white">
              BMAD Methodology Powered
            </Badge>
            <h2 className="text-4xl font-bold mb-4">Battle-Tested Development Framework</h2>
            <p className="text-xl text-gray-600">Integrated Business Method for Agile Development ensures enterprise-grade quality</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Analyst Agent", desc: "Requirements extraction & market analysis", icon: "🔍" },
              { title: "Architect Agent", desc: "System design & technical architecture", icon: "🏗️" },
              { title: "Developer Agent", desc: "Code generation & implementation", icon: "⚡" },
              { title: "QA Agent", desc: "Testing & quality assurance", icon: "✅" }
            ].map((agent, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-4xl mb-2">{agent.icon}</div>
                  <CardTitle className="text-lg">{agent.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{agent.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Enterprise-Grade Features</h2>
            <p className="text-xl text-gray-600">Everything you need for Fortune 500 deployment</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Advanced Security", features: ["AES-256 encryption", "SSO/SAML integration", "Role-based access", "Audit logging"] },
              { title: "Compliance Ready", features: ["SOC 2 Type II", "GDPR compliant", "HIPAA ready", "Custom compliance"] },
              { title: "Enterprise Support", features: ["24/7 priority support", "Dedicated success manager", "Custom training", "SLA guarantee"] },
              { title: "Scalability", features: ["Auto-scaling deployment", "Multi-region support", "Load balancing", "99.9% uptime"] },
              { title: "Integration", features: ["API-first architecture", "Webhook support", "Custom connectors", "Legacy system integration"] },
              { title: "Analytics", features: ["Usage analytics", "Performance metrics", "ROI tracking", "Custom dashboards"] }
            ].map((feature, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.features.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center gap-2 text-gray-600">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator Preview */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Calculate Your Enterprise ROI</h2>
          <p className="text-xl text-gray-600 mb-8">See how much your organization can save with our platform</p>
          
          <Card className="p-8 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-3xl font-bold text-green-600 mb-2">$2.4M+</p>
                <p className="text-gray-600">Average annual savings</p>
              </div>
              <div>
                <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <p className="text-3xl font-bold text-blue-600 mb-2">450%</p>
                <p className="text-gray-600">Average ROI</p>
              </div>
              <div>
                <Clock className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <p className="text-3xl font-bold text-purple-600 mb-2">3 months</p>
                <p className="text-gray-600">Payback period</p>
              </div>
            </div>
            
            <Button size="lg" className="mt-8 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
              Get Your Custom ROI Report
            </Button>
          </Card>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">Trusted by Industry Leaders</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                quote: "Reduced our development time by 95% while maintaining enterprise-grade quality. The BMAD methodology integration is game-changing.",
                author: "Sarah Chen, CTO",
                company: "Fortune 100 Financial Services"
              },
              { 
                quote: "We generated 47 mission-critical applications in 6 months. Would have taken our team 15+ years with traditional methods.",
                author: "Michael Rodriguez, VP Engineering", 
                company: "Global Healthcare Corporation"
              },
              { 
                quote: "The ROI exceeded our most optimistic projections. $3.2M in savings in year one alone.",
                author: "Jennifer Walsh, Chief Digital Officer",
                company: "Fortune 500 Manufacturing"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent>
                  <p className="text-gray-600 mb-4 italic">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold mb-6">Ready to Transform Your Enterprise?</h2>
          <p className="text-xl mb-8">Join hundreds of Fortune 500 companies already using our platform</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-100">
              Schedule Demo Now
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-blue-600">
              Start Free POC
            </Button>
          </div>
          
          <div className="text-sm opacity-90">
            <p>🚀 Get your proof of concept in 24 hours • 💼 Enterprise support included • 🔒 Bank-grade security</p>
          </div>
        </div>
      </section>
    </div>
  );
}
