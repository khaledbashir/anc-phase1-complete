/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  // Force-generate brand-blue utilities — JIT scanner misses them despite correct config
  safelist: [
    // Base utilities
    'bg-brand-blue', 'text-brand-blue', 'border-brand-blue', 'ring-brand-blue',
    'from-brand-blue', 'accent-brand-blue', 'border-t-brand-blue',
    // Opacity modifiers
    'bg-brand-blue/5', 'bg-brand-blue/10', 'bg-brand-blue/15', 'bg-brand-blue/20',
    'bg-brand-blue/30', 'bg-brand-blue/80', 'bg-brand-blue/90',
    'text-brand-blue/70', 'text-brand-blue/80', 'text-brand-blue/90',
    'border-brand-blue/10', 'border-brand-blue/20', 'border-brand-blue/30',
    'border-brand-blue/40', 'border-brand-blue/50',
    'ring-brand-blue/30', 'shadow-brand-blue/10', 'shadow-brand-blue/20',
    // Variant prefixes
    'hover:bg-brand-blue/10', 'hover:bg-brand-blue/15', 'hover:bg-brand-blue/20',
    'hover:bg-brand-blue/80', 'hover:bg-brand-blue/90',
    'hover:text-brand-blue', 'hover:text-brand-blue/80', 'hover:text-brand-blue/90',
    'hover:border-brand-blue/30', 'hover:border-brand-blue/40', 'hover:border-brand-blue/50',
    'focus:border-brand-blue', 'focus:border-brand-blue/50', 'focus:ring-brand-blue',
    'focus-visible:ring-brand-blue/30',
    'group-hover:bg-brand-blue', 'group-hover:bg-brand-blue/20', 'group-hover:text-brand-blue',
    'data-[state=checked]:bg-brand-blue',
    'selection:bg-brand-blue/30',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				french: '#0A52EF'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))',
  				splash: '#03B8FF',
  				malibu: '#0385DD',
  				opal: '#002C73'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			navy: {
  				DEFAULT: '#002C73',
  				foreground: '#ffffff',
  			},
  			brand: {
  				blue: '#0A52EF',
  				splash: '#03B8FF',
  				malibu: '#0385DD',
  				opal: '#002C73',
  			},
  		},
  		borderRadius: {
  			lg: '4px',
  			md: '3px',
  			sm: '2px',
  		},
  		boxShadow: {
  			'card': '0 1px 3px rgba(0,0,0,0.05)',
  			'card-hover': '0 4px 6px rgba(0,0,0,0.08)',
  			'lift': '0 2px 8px rgba(0,0,0,0.06)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: 0
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: 0
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		fontFamily: {
  			sans: [
  				'Work Sans',
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			serif: [
  				'var(--font-playfair)',
  				'Playfair Display',
  				'Georgia',
  				'serif'
  			]
  		}
  	}
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
}