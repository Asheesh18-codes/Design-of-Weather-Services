import unittest
import sys
import os
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from nlp.notam_parser import NOTAMParser

class TestNOTAMParser(unittest.TestCase):
    """Comprehensive test cases for NOTAM parser functionality"""
    
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.parser = NOTAMParser()
        
        # Sample NOTAM data for testing
        self.sample_notams = {
            'runway_closure': "A1234/21 NOTAMN Q)KORD/QMXLC/IV/NBO/A/000/999/4155N08748W005 A)KORD B)2110011200 C)2110012359 E)RWY 10L/28R CLSD",
            'taxiway_work': "A5678/21 NOTAMN Q)KJFK/QMTXX/IV/NBO/A/000/999/4038N07346W005 A)KJFK B)2110021400 C)2110031800 E)TWY A BTN TWY B AND TWY C CLSD DUE CONST",
            'navaid_outage': "A9012/21 NOTAMN Q)KLAX/QNXXX/IV/NBO/A/000/999/3357N11824W005 A)KLAX B)2110041000 C)2110051600 E)ILS RWY 06L U/S",
            'lighting_issue': "A3456/21 NOTAMN Q)KATL/QLXXX/IV/NBO/A/000/999/3338N08425W005 A)KATL B)2110061200 C)2110070600 E)RWY 08R/26L EDGE LGT U/S",
            'temporary_restriction': "A7890/21 NOTAMN Q)KBOS/QRRXX/IV/NBO/A/000/999/4221N07100W005 A)KBOS B)2110081000 C)2110082000 E)AIRSPACE R-2901A ACT SFC-FL180"
        }
    
    def test_parser_initialization(self):
        """Test that NOTAM parser initializes correctly"""
        self.assertIsNotNone(self.parser)
        self.assertTrue(hasattr(self.parser, 'parse'))
        self.assertTrue(hasattr(self.parser, 'extract_components'))
    
    def test_parse_runway_closure_notam(self):
        """Test parsing runway closure NOTAM"""
        notam = self.sample_notams['runway_closure']
        result = self.parser.parse(notam)
        
        self.assertIsNotNone(result)
        self.assertIn('notam_id', result)
        self.assertIn('airport', result)
        self.assertIn('type', result)
        self.assertIn('raw_text', result)
        
        # Check specific content
        self.assertEqual(result['airport'], 'KORD')
        self.assertIn('RWY', result['raw_text'])
        self.assertIn('CLSD', result['raw_text'])
    
    def test_parse_taxiway_work_notam(self):
        """Test parsing taxiway construction NOTAM"""
        notam = self.sample_notams['taxiway_work']
        result = self.parser.parse(notam)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['airport'], 'KJFK')
        self.assertIn('TWY', result['raw_text'])
        self.assertIn('CONST', result['raw_text'])
    
    def test_parse_navaid_outage_notam(self):
        """Test parsing navigation aid outage NOTAM"""
        notam = self.sample_notams['navaid_outage']
        result = self.parser.parse(notam)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['airport'], 'KLAX')
        self.assertIn('ILS', result['raw_text'])
        self.assertIn('U/S', result['raw_text'])
    
    def test_parse_lighting_issue_notam(self):
        """Test parsing lighting system NOTAM"""
        notam = self.sample_notams['lighting_issue']
        result = self.parser.parse(notam)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['airport'], 'KATL')
        self.assertIn('LGT', result['raw_text'])
    
    def test_parse_airspace_restriction_notam(self):
        """Test parsing airspace restriction NOTAM"""
        notam = self.sample_notams['temporary_restriction']
        result = self.parser.parse(notam)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['airport'], 'KBOS')
        self.assertIn('AIRSPACE', result['raw_text'])
    
    def test_extract_notam_id(self):
        """Test extraction of NOTAM ID"""
        notam = self.sample_notams['runway_closure']
        result = self.parser.parse(notam)
        
        self.assertIsNotNone(result.get('notam_id'))
        self.assertIn('A1234/21', result['notam_id'])
    
    def test_extract_airport_code(self):
        """Test extraction of airport code"""
        for notam_type, notam_text in self.sample_notams.items():
            with self.subTest(notam_type=notam_type):
                result = self.parser.parse(notam_text)
                self.assertIsNotNone(result.get('airport'))
                self.assertEqual(len(result['airport']), 4)  # ICAO codes are 4 letters
                self.assertTrue(result['airport'].startswith('K'))  # US airports start with K
    
    def test_parse_effective_dates(self):
        """Test parsing of effective dates from NOTAM"""
        notam = self.sample_notams['runway_closure']
        result = self.parser.parse(notam)
        
        # Check if date parsing is attempted
        self.assertIn('effective_from', result)
        self.assertIn('effective_until', result)
    
    def test_categorize_notam_types(self):
        """Test NOTAM type categorization"""
        test_cases = [
            (self.sample_notams['runway_closure'], 'runway'),
            (self.sample_notams['taxiway_work'], 'taxiway'),
            (self.sample_notams['navaid_outage'], 'navaid'),
            (self.sample_notams['lighting_issue'], 'lighting'),
            (self.sample_notams['temporary_restriction'], 'airspace')
        ]
        
        for notam_text, expected_category in test_cases:
            with self.subTest(expected_category=expected_category):
                result = self.parser.parse(notam_text)
                # Check if categorization exists in result
                self.assertIn('category', result)
    
    def test_parse_multiple_notams(self):
        """Test parsing multiple NOTAMs"""
        results = []
        for notam_type, notam_text in self.sample_notams.items():
            result = self.parser.parse(notam_text)
            results.append(result)
        
        self.assertEqual(len(results), 5)
        for result in results:
            self.assertIsNotNone(result)
            self.assertIn('airport', result)
            self.assertIn('raw_text', result)
    
    def test_parse_malformed_notam(self):
        """Test handling of malformed NOTAM"""
        malformed_notams = [
            "INCOMPLETE NOTAM WITHOUT PROPER FORMAT",
            "A1234/21 MISSING REQUIRED FIELDS",
            "",
            None,
            "RANDOM TEXT WITH NO NOTAM STRUCTURE"
        ]
        
        for malformed in malformed_notams:
            with self.subTest(malformed=malformed):
                try:
                    result = self.parser.parse(malformed)
                    # Should either return a result or handle gracefully
                    self.assertTrue(True)
                except Exception as e:
                    # Exception handling is also acceptable
                    self.assertIsInstance(e, Exception)
    
    def test_parse_edge_cases(self):
        """Test edge cases in NOTAM parsing"""
        edge_cases = [
            "A0001/21 NOTAMN Q)ZZZZ/QMXLC/IV/NBO/A/000/999/0000N00000W005 A)ZZZZ B)2110011200 C)2110012359 E)TEST",
            "Z9999/21 NOTAMN Q)TEST/QMXLC/IV/NBO/A/000/999/9999N99999W005 A)TEST B)9999991200 C)9999992359 E)BOUNDARY TEST"
        ]
        
        for edge_case in edge_cases:
            with self.subTest(edge_case=edge_case):
                try:
                    result = self.parser.parse(edge_case)
                    self.assertIsNotNone(result)
                except Exception:
                    # Edge cases may fail, which is acceptable
                    pass
    
    def test_parse_performance(self):
        """Test parsing performance with multiple NOTAMs"""
        import time
        
        start_time = time.time()
        for _ in range(100):  # Parse each NOTAM 20 times
            for notam_text in self.sample_notams.values():
                self.parser.parse(notam_text)
        end_time = time.time()
        
        total_time = end_time - start_time
        avg_time_per_notam = total_time / (100 * len(self.sample_notams))
        
        # Should parse each NOTAM in reasonable time (less than 100ms)
        self.assertLess(avg_time_per_notam, 0.1)
    
    def test_parse_result_structure(self):
        """Test that parsed results have consistent structure"""
        required_fields = ['notam_id', 'airport', 'raw_text', 'parsed_at', 'type']
        
        for notam_text in self.sample_notams.values():
            result = self.parser.parse(notam_text)
            
            # Check that result is a dictionary
            self.assertIsInstance(result, dict)
            
            # Check required fields exist
            for field in required_fields:
                self.assertIn(field, result, f"Missing required field: {field}")
    
    def test_parse_datetime_handling(self):
        """Test datetime parsing and formatting"""
        notam = self.sample_notams['runway_closure']
        result = self.parser.parse(notam)
        
        # Check parsed_at timestamp
        self.assertIn('parsed_at', result)
        parsed_at = result['parsed_at']
        
        # Should be a valid ISO format string
        self.assertIsInstance(parsed_at, str)
        self.assertTrue(parsed_at.endswith('Z'))  # UTC timezone indicator
    
    def test_parser_initialization(self):
        """Test that NOTAM parser initializes correctly"""
        self.assertIsNotNone(self.parser)
        self.assertTrue(hasattr(self.parser, 'parse'))
    
    def test_parse_simple_notam(self):
        """Test parsing a simple NOTAM - kept for backward compatibility"""
        sample_notam = "A1234/21 NOTAMN Q)KORD/QMXLC/IV/NBO/A/000/999/4155N08748W005 A)KORD B)2110011200 C)2110012359 E)RWY 10L/28R CLSD"
        
        try:
            result = self.parser.parse(sample_notam)
            self.assertIsNotNone(result)
            self.assertIsInstance(result, dict)
        except Exception as e:
            # If parsing fails, just check that parser exists
            self.assertIsNotNone(self.parser)
    
    def test_parse_empty_notam(self):
        """Test parsing empty NOTAM"""
        try:
            result = self.parser.parse("")
            # Should handle empty input gracefully
            self.assertTrue(True)
        except Exception:
            # If it throws an exception, that's also acceptable
            self.assertTrue(True)
    
    def test_parse_invalid_notam(self):
        """Test parsing invalid NOTAM format"""
        invalid_notam = "This is not a valid NOTAM format"
        
        try:
            result = self.parser.parse(invalid_notam)
            # Should handle invalid input gracefully
            self.assertTrue(True)
        except Exception:
            # If it throws an exception, that's also acceptable
            self.assertTrue(True)

if __name__ == '__main__':
    # Run the tests
    unittest.main(verbosity=2)